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
}

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
}
