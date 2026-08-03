import type { ProviderError } from "../errors/provider-error.js";
import type { Message } from "../message/types.js";
import type { ToolDefinition } from "../tool/types.js";
import type { JsonObject } from "../types/json.js";

/**
 * Tool call as represented on the provider wire format.
 *
 * Unlike runtime `ToolCall`, `arguments` remain serialized JSON.
 */
export interface ProviderToolCall {
  /**
   * Unique identifier for this tool call.
   */
  id: string;

  /**
   * Tool name to invoke.
   */
  name: string;

  /**
   * JSON-encoded argument payload.
   */
  arguments: string;
}

/**
 * Why a provider generation stopped.
 *
 * - `"stop"`: natural completion
 * - `"tool_calls"`: model requested one or more tools
 * - `"length"`: hit a token/length limit
 * - `"content_filter"`: blocked by a safety filter
 * - `"error"`: provider-side failure
 * - `"cancelled"`: aborted by the caller
 */
export type ProviderFinishReason =
  | "stop"
  | "tool_calls"
  | "length"
  | "content_filter"
  | "error"
  | "cancelled";

/**
 * Token usage reported by a provider, when available.
 */
export interface ProviderUsage {
  /**
   * Tokens consumed by the prompt / input.
   */
  inputTokens?: number;

  /**
   * Tokens produced in the completion / output.
   */
  outputTokens?: number;

  /**
   * Total tokens reported by the provider, when known.
   */
  totalTokens?: number;
}

/**
 * Feature flags describing what a provider implementation supports.
 */
export interface ProviderCapabilities {
  /**
   * Whether {@link ModelProvider.stream} is supported.
   */
  streaming: boolean;

  /**
   * Whether tool / function calling is supported.
   */
  tools: boolean;

  /**
   * Whether structured output (`responseFormat`) is supported.
   *
   * Reserved for future provider adapters; may be `false` today.
   */
  structuredOutput: boolean;

  /**
   * Whether multimodal / image inputs are supported.
   */
  vision?: boolean;

  /**
   * Whether a dedicated system message role is supported.
   */
  systemMessage?: boolean;
}

/**
 * Metadata describing a model exposed by a provider.
 */
export interface ModelInfo {
  /**
   * Provider-specific model identifier.
   */
  id: string;

  /**
   * Human-readable model name.
   */
  name?: string;

  /**
   * Owning provider identifier (e.g. `"mock"`, `"anthropic"`).
   */
  provider?: string;

  /**
   * Maximum context window size in tokens, when known.
   */
  contextWindow?: number;

  /**
   * Maximum output tokens supported by the model, when known.
   */
  maxOutputTokens?: number;

  /**
   * Model-level capability overrides.
   */
  capabilities?: Partial<ProviderCapabilities>;

  /**
   * Arbitrary provider-agnostic metadata.
   */
  metadata?: JsonObject;
}

/**
 * Structured output request shape.
 *
 * Reserved for future compatibility — providers may ignore unsupported formats.
 */
export type ProviderResponseFormat =
  | {
      /** Free-form natural language output. */
      type: "text";
    }
  | {
      /** JSON object output without an explicit schema. */
      type: "json_object";
    }
  | {
      /** JSON output constrained by a JSON Schema-like object. */
      type: "json_schema";
      /** Schema name used by the provider when required. */
      name: string;
      /** JSON-Schema-like definition. */
      schema: JsonObject;
      /** Whether the provider should enforce the schema strictly. */
      strict?: boolean;
    };

/**
 * Provider-agnostic request to generate a model response.
 */
export interface ProviderRequest {
  /**
   * Conversation messages to send to the provider.
   */
  messages: Message[];

  /**
   * Tools available for the model to call.
   */
  tools?: ToolDefinition[];

  /**
   * Model identifier understood by the target provider.
   */
  model?: string;

  /**
   * Sampling temperature.
   */
  temperature?: number;

  /**
   * Maximum number of tokens to generate.
   */
  maxTokens?: number;

  /**
   * Sequences that should stop generation when encountered.
   */
  stopSequences?: string[];

  /**
   * Desired response format for structured output (future-compatible).
   */
  responseFormat?: ProviderResponseFormat;

  /**
   * Abort signal for cooperative cancellation.
   */
  signal?: AbortSignal;

  /**
   * Arbitrary provider-agnostic metadata.
   */
  metadata?: JsonObject;
}

/**
 * Provider-agnostic response from a model generation.
 */
export interface ProviderResponse {
  /**
   * Assistant message produced by the provider.
   */
  message: Message;

  /**
   * Reason generation ended.
   */
  finishReason?: ProviderFinishReason;

  /**
   * Token usage for the request, when reported.
   */
  usage?: ProviderUsage;

  /**
   * Model identifier that produced the response, when reported.
   */
  model?: string;

  /**
   * Parsed structured output when `responseFormat` was requested.
   *
   * Reserved for future compatibility.
   */
  structuredOutput?: JsonObject;

  /**
   * Arbitrary provider-agnostic metadata.
   */
  metadata?: JsonObject;
}

/**
 * Events emitted by {@link ModelProvider.stream}.
 */
export type ProviderStreamEvent =
  | {
      /** Incremental assistant text. */
      type: "delta";
      delta: string;
    }
  | {
      /** Incremental tool-call argument fragment. */
      type: "tool_call_delta";
      toolCallId: string;
      name?: string;
      argumentsDelta?: string;
    }
  | {
      /** A complete assistant message snapshot. */
      type: "message";
      message: Message;
    }
  | {
      /** Token usage update. */
      type: "usage";
      usage: ProviderUsage;
    }
  | {
      /** Stream completed successfully. */
      type: "done";
      response: ProviderResponse;
    }
  | {
      /** Stream failed. */
      type: "error";
      error: ProviderError;
    };
