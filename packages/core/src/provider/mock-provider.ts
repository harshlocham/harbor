import { randomUUID } from "node:crypto";

import { HarborError } from "../errors/harbor-error.js";
import type { RunContext } from "../runtime/context.js";
import type { ToolCall } from "../tool/types.js";

import type { ModelProvider } from "./model-provider.js";
import type { ProviderRequest, ProviderResponse } from "./types.js";

/**
 * A scripted or factory response used by {@link MockProvider}.
 */
export type MockProviderResponse =
  | ProviderResponse
  | ((
      request: ProviderRequest,
      context: RunContext,
    ) => ProviderResponse | Promise<ProviderResponse>);

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
}

/**
 * In-memory {@link ModelProvider} for unit tests.
 *
 * Does not call external APIs. Supports a default assistant message, scripted
 * tool-call responses, and multi-turn response sequences.
 */
export class MockProvider implements ModelProvider {
  /**
   * Provider requests received by `generate()`, in call order.
   */
  readonly requests: ProviderRequest[] = [];

  readonly #fallbackContent: string;
  readonly #strict: boolean;
  readonly #queue: MockProviderResponse[];

  /**
   * @param options - Mock behavior configuration.
   */
  constructor(options: MockProviderOptions = {}) {
    this.#fallbackContent = options.content ?? "ok";
    this.#queue = [...(options.responses ?? [])];
    this.#strict =
      options.strict ?? (options.responses !== undefined && options.responses.length > 0);
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
   * @param request - Provider request from the runtime.
   * @param context - Active run context.
   */
  async generate(request: ProviderRequest, context: RunContext): Promise<ProviderResponse> {
    this.requests.push({
      ...request,
      messages: request.messages.map((message) => ({ ...message })),
      ...(request.tools !== undefined ? { tools: request.tools.map((tool) => ({ ...tool })) } : {}),
    });

    const next = this.#queue.shift();
    if (next === undefined) {
      if (this.#strict) {
        throw new HarborError("MockProvider response queue exhausted", {
          code: "mock_provider_exhausted",
        });
      }
      return MockProvider.text(this.#fallbackContent);
    }

    if (typeof next === "function") {
      return next(request, context);
    }
    return next;
  }
}
