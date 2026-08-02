import { randomUUID } from "node:crypto";

import type { Agent } from "../agent/agent.js";
import { HarborError } from "../errors/harbor-error.js";
import { MaxIterationsExceededError } from "../errors/max-iterations-exceeded-error.js";
import { NotImplementedError } from "../errors/not-implemented-error.js";
import type { Message } from "../message/types.js";
import type { ProviderRequest } from "../provider/types.js";
import type { Tool } from "../tool/types.js";

import type { RunContext } from "./context.js";
import type { RuntimeEvent } from "./events.js";
import {
  createSystemMessage,
  hasToolCalls,
  normalizeInput,
  toolResultToMessage,
} from "./messages.js";
import { TraceRecorder } from "./trace.js";
import { executeToolCall, indexTools, toToolDefinitions } from "./tool-executor.js";
import type { RunOptions, RunResult, RunStreamEvent } from "./types.js";

const DEFAULT_MAX_ITERATIONS = 10;

/**
 * Optional defaults applied to every run on this runtime instance.
 */
export interface RuntimeConfig {
  /**
   * Default maximum model/tool loop iterations.
   */
  maxIterations?: number;

  /**
   * Default runtime event listener.
   */
  onEvent?: (event: RuntimeEvent) => void;
}

/**
 * Harbor agent runtime.
 *
 * Executes provider-agnostic agent loops via {@link Runtime.run}.
 */
export class Runtime {
  readonly #defaults: RuntimeConfig;

  /**
   * @param config - Optional runtime defaults.
   */
  constructor(config: RuntimeConfig = {}) {
    this.#defaults = config;
  }

  /**
   * Execute a run to completion using an iterative model/tool loop.
   *
   * @param options - Run input and options.
   * @returns Final run result.
   */
  async run(options: RunOptions): Promise<RunResult> {
    const agent = options.agent;
    const runId = randomUUID();
    const maxIterations =
      options.maxIterations ??
      agent.config.maxIterations ??
      this.#defaults.maxIterations ??
      DEFAULT_MAX_ITERATIONS;

    const context = createRunContext(runId, agent, options);
    const trace = new TraceRecorder(runId);
    const emit = createEmitter(options.onEvent ?? this.#defaults.onEvent);
    const tools = agent.config.tools ?? [];
    const toolsByName = indexTools(tools);

    const messages: Message[] = [];
    const append = (message: Message): void => {
      messages.push(message);
      emit({ type: "message", message });
    };

    emit({ type: "run.start", context });

    if (agent.config.instructions !== undefined && agent.config.instructions.length > 0) {
      append(createSystemMessage(agent.config.instructions));
    }
    for (const message of normalizeInput(options.input)) {
      append(message);
    }

    try {
      for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
        options.signal?.throwIfAborted();
        emit({ type: "iteration.start", iteration });

        const request = buildProviderRequest(messages, agent, tools);
        emit({ type: "provider.request", request });

        const providerSpan = trace.startSpan("provider.generate", {
          iteration,
          model: agent.config.model ?? null,
        });

        let response;
        try {
          response = await agent.config.provider.generate(request, context);
          providerSpan.end();
        } catch (error) {
          providerSpan.end(error);
          throw toHarborError(error, "provider_error");
        }

        emit({ type: "provider.response", response });
        append(response.message);

        if (!hasToolCalls(response.message)) {
          const result: RunResult = {
            runId,
            status: "completed",
            messages: [...messages],
            output: response.message,
            trace: trace.snapshot(),
          };
          emit({ type: "iteration.end", iteration });
          emit({ type: "run.end", result });
          return result;
        }

        for (const toolCall of response.message.toolCalls) {
          options.signal?.throwIfAborted();
          emit({ type: "tool.start", toolCall });

          const toolSpan = trace.startSpan("tool.execute", {
            toolName: toolCall.name,
            toolCallId: toolCall.id,
          });

          const toolResult = await executeToolCall(toolCall, toolsByName, context);
          toolSpan.end(toolResult.isError === true ? toolResult.content : undefined);

          emit({ type: "tool.end", toolResult });
          append(toolResultToMessage(toolResult));
        }

        emit({ type: "iteration.end", iteration });
      }

      const exceeded = new MaxIterationsExceededError(maxIterations);
      emit({ type: "error", error: exceeded });
      const result: RunResult = {
        runId,
        status: "failed",
        messages: [...messages],
        error: exceeded,
        trace: trace.snapshot(),
      };
      emit({ type: "run.end", result });
      throw exceeded;
    } catch (error) {
      if (error instanceof MaxIterationsExceededError) {
        throw error;
      }

      const harborError = toHarborError(error, "run_error");
      emit({ type: "error", error: harborError });
      const result: RunResult = {
        runId,
        status: isAbortError(error) ? "cancelled" : "failed",
        messages: [...messages],
        error: harborError,
        trace: trace.snapshot(),
      };
      emit({ type: "run.end", result });
      throw harborError;
    }
  }

  /**
   * Stream events for a run as it executes.
   *
   * @param _options - Run input and options.
   * @returns Async iterable of stream events.
   */
  stream(_options: RunOptions): AsyncIterable<RunStreamEvent> {
    return {
      [Symbol.asyncIterator]() {
        return {
          next() {
            return Promise.reject(new NotImplementedError("Runtime.stream"));
          },
        };
      },
    };
  }

  /**
   * Resume a previously paused or interrupted run.
   *
   * @param _runId - Identifier of the run to resume.
   * @param _options - Optional additional input for the resumed run.
   * @returns Final run result.
   */
  async resume(_runId: string, _options?: RunOptions): Promise<RunResult> {
    throw new NotImplementedError("Runtime.resume");
  }

  /**
   * Cancel an in-flight run.
   *
   * @param _runId - Identifier of the run to cancel.
   */
  async cancel(_runId: string): Promise<void> {
    throw new NotImplementedError("Runtime.cancel");
  }
}

function createRunContext(runId: string, agent: Agent, options: RunOptions): RunContext {
  const context: RunContext = {
    runId,
    agentName: agent.name,
  };
  if (options.sessionId !== undefined) {
    context.sessionId = options.sessionId;
  }
  if (options.signal !== undefined) {
    context.signal = options.signal;
  }
  if (options.metadata !== undefined) {
    context.metadata = options.metadata;
  }
  return context;
}

function buildProviderRequest(
  messages: Message[],
  agent: Agent,
  tools: readonly Tool[],
): ProviderRequest {
  const request: ProviderRequest = {
    messages: messages.map((message) => ({ ...message })),
  };
  if (tools.length > 0) {
    request.tools = toToolDefinitions(tools);
  }
  if (agent.config.model !== undefined) {
    request.model = agent.config.model;
  }
  if (agent.config.metadata !== undefined) {
    request.metadata = agent.config.metadata;
  }
  return request;
}

function createEmitter(
  onEvent: ((event: RuntimeEvent) => void) | undefined,
): (event: RuntimeEvent) => void {
  return (event) => {
    onEvent?.(event);
  };
}

function toHarborError(error: unknown, code: string): HarborError {
  if (error instanceof HarborError) {
    return error;
  }
  if (error instanceof Error) {
    return new HarborError(error.message, { code, cause: error });
  }
  return new HarborError(String(error), { code, cause: error });
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}
