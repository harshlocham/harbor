import { randomUUID } from "node:crypto";

import { ProviderError } from "../errors/provider-error.js";
import type { ToolCall } from "../tool/types.js";

import type { ModelProvider } from "./model-provider.js";
import type {
  ModelInfo,
  ProviderCapabilities,
  ProviderRequest,
  ProviderResponse,
  ProviderStreamEvent,
} from "./types.js";

/**
 * A scripted or factory response used by {@link MockProvider}.
 */
export type MockProviderResponse =
  | ProviderResponse
  | ((request: ProviderRequest) => ProviderResponse | Promise<ProviderResponse>);

/**
 * Configuration for {@link MockProvider}.
 */
export interface MockProviderOptions {
  /**
   * Fallback assistant text returned when the response queue is empty.
   *
   * Ignored when {@link MockProviderOptions.strict} is `true`.
   *
   * @defaultValue `"ok"`
   */
  content?: string;

  /**
   * Ordered responses returned by successive `generate()` calls.
   */
  responses?: readonly MockProviderResponse[];

  /**
   * When `true`, `generate()` throws if the response queue is exhausted.
   *
   * Defaults to `true` when `responses` is provided, otherwise `false`.
   */
  strict?: boolean;

  /**
   * Optional capability overrides for this mock instance.
   */
  capabilities?: Partial<ProviderCapabilities>;

  /**
   * Optional model metadata returned by {@link MockProvider.getModelInfo}.
   */
  modelInfo?: ModelInfo;
}

const DEFAULT_CAPABILITIES: ProviderCapabilities = {
  streaming: true,
  tools: true,
  structuredOutput: false,
  systemMessage: true,
};

/**
 * In-memory {@link ModelProvider} for unit tests.
 *
 * Does not call external APIs. Supports a default assistant message, scripted
 * tool-call responses, multi-turn sequences, and a simple stream adapter.
 */
export class MockProvider implements ModelProvider {
  /**
   * Provider identifier.
   */
  readonly id = "mock";

  /**
   * Declared mock provider capabilities.
   */
  readonly capabilities: ProviderCapabilities;

  /**
   * Provider requests received by `generate()`, in call order.
   */
  readonly requests: ProviderRequest[] = [];

  readonly #fallbackContent: string;
  readonly #strict: boolean;
  readonly #queue: MockProviderResponse[];
  readonly #modelInfo: ModelInfo | undefined;

  /**
   * @param options - Mock behavior configuration.
   */
  constructor(options: MockProviderOptions = {}) {
    this.#fallbackContent = options.content ?? "ok";
    this.#queue = [...(options.responses ?? [])];
    this.#strict =
      options.strict ?? (options.responses !== undefined && options.responses.length > 0);
    this.capabilities = {
      ...DEFAULT_CAPABILITIES,
      ...options.capabilities,
    };
    this.#modelInfo = options.modelInfo;
  }

  /**
   * Append scripted responses for later `generate()` calls.
   *
   * @param responses - Responses to enqueue.
   */
  enqueue(...responses: MockProviderResponse[]): this {
    this.#queue.push(...responses);
    return this;
  }

  /**
   * Number of scripted responses still waiting to be returned.
   */
  get pending(): number {
    return this.#queue.length;
  }

  /**
   * Build a normal assistant text response.
   *
   * @param content - Assistant message content.
   * @param extras - Optional finish reason / usage fields.
   */
  static text(content: string, extras: Omit<ProviderResponse, "message"> = {}): ProviderResponse {
    const response: ProviderResponse = {
      message: {
        id: randomUUID(),
        role: "assistant",
        content,
        createdAt: Date.now(),
      },
      finishReason: extras.finishReason ?? "stop",
    };
    if (extras.usage !== undefined) {
      response.usage = extras.usage;
    }
    if (extras.model !== undefined) {
      response.model = extras.model;
    }
    if (extras.structuredOutput !== undefined) {
      response.structuredOutput = extras.structuredOutput;
    }
    if (extras.metadata !== undefined) {
      response.metadata = extras.metadata;
    }
    return response;
  }

  /**
   * Build an assistant response that requests tool calls.
   *
   * @param toolCalls - Tool calls to include on the assistant message.
   * @param content - Optional assistant text alongside the tool calls.
   */
  static toolCalls(toolCalls: ToolCall[], content = ""): ProviderResponse {
    return {
      message: {
        id: randomUUID(),
        role: "assistant",
        content,
        toolCalls: toolCalls.map((toolCall) => ({ ...toolCall })),
        createdAt: Date.now(),
      },
      finishReason: "tool_calls",
    };
  }

  /**
   * Return the next scripted response, or the fallback assistant message.
   *
   * @param request - Provider-agnostic generation request.
   */
  async generate(request: ProviderRequest): Promise<ProviderResponse> {
    request.signal?.throwIfAborted();

    this.requests.push({
      ...request,
      messages: request.messages.map((message) => ({ ...message })),
      ...(request.tools !== undefined ? { tools: request.tools.map((tool) => ({ ...tool })) } : {}),
    });

    const next = this.#queue.shift();
    if (next === undefined) {
      if (this.#strict) {
        throw new ProviderError("MockProvider response queue exhausted", {
          code: "provider_invalid_request",
          provider: this.id,
        });
      }
      return MockProvider.text(this.#fallbackContent);
    }

    if (typeof next === "function") {
      return next(request);
    }
    return next;
  }

  /**
   * Stream a scripted response as text deltas followed by a terminal `done` event.
   *
   * @param request - Provider-agnostic generation request.
   */
  async *stream(request: ProviderRequest): AsyncIterable<ProviderStreamEvent> {
    if (!this.capabilities.streaming) {
      throw new ProviderError("MockProvider streaming is disabled", {
        code: "provider_not_supported",
        provider: this.id,
      });
    }

    try {
      const response = await this.generate(request);
      const content = response.message.content;

      if (content.length > 0) {
        const chunkSize = Math.max(1, Math.ceil(content.length / 3));
        for (let index = 0; index < content.length; index += chunkSize) {
          request.signal?.throwIfAborted();
          yield {
            type: "delta",
            delta: content.slice(index, index + chunkSize),
          };
        }
      }

      yield { type: "message", message: response.message };

      if (response.usage !== undefined) {
        yield { type: "usage", usage: response.usage };
      }

      yield { type: "done", response };
    } catch (error) {
      if (error instanceof ProviderError) {
        yield { type: "error", error };
        return;
      }
      const providerError = new ProviderError(
        error instanceof Error ? error.message : String(error),
        {
          code: "provider_error",
          provider: this.id,
          cause: error,
        },
      );
      yield { type: "error", error: providerError };
    }
  }

  /**
   * Return mock model metadata for the given id.
   *
   * @param modelId - Model identifier.
   */
  getModelInfo(modelId: string): ModelInfo {
    if (this.#modelInfo !== undefined) {
      return { ...this.#modelInfo, id: modelId };
    }
    return {
      id: modelId,
      name: modelId,
      provider: this.id,
      capabilities: this.capabilities,
    };
  }
}
