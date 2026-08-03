import type { ProviderErrorCode, ProviderFinishReason, ProviderUsage } from "@harborts/core";
import { ProviderError } from "@harborts/core";

import type { OpenAIChatCompletionUsage } from "./types.js";

/**
 * Map an OpenAI finish reason string into a Harbor finish reason.
 *
 * @param reason - OpenAI `finish_reason` value.
 */
export function mapOpenAIFinishReason(
  reason: string | null | undefined,
): ProviderFinishReason | undefined {
  switch (reason) {
    case "stop":
    case "tool_calls":
    case "length":
    case "content_filter":
      return reason;
    case null:
    case undefined:
      return undefined;
    default:
      return "stop";
  }
}

/**
 * Map OpenAI usage into Harbor provider usage.
 *
 * @param usage - OpenAI usage block.
 */
export function mapOpenAIUsage(
  usage: OpenAIChatCompletionUsage | null | undefined,
): ProviderUsage | undefined {
  if (usage == null) {
    return undefined;
  }

  const mapped: ProviderUsage = {};
  if (usage.prompt_tokens !== undefined) {
    mapped.inputTokens = usage.prompt_tokens;
  }
  if (usage.completion_tokens !== undefined) {
    mapped.outputTokens = usage.completion_tokens;
  }
  if (usage.total_tokens !== undefined) {
    mapped.totalTokens = usage.total_tokens;
  }
  return mapped;
}

/**
 * Convert an unknown OpenAI SDK / transport failure into {@link ProviderError}.
 *
 * @param error - Unknown failure thrown by the OpenAI client.
 */
export function toProviderError(error: unknown): ProviderError {
  if (error instanceof ProviderError) {
    return error;
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "OpenAI provider request failed";

  const statusCode = readStatusCode(error);
  const code = mapStatusToCode(statusCode);

  return new ProviderError(message, {
    code,
    provider: "openai",
    ...(statusCode !== undefined ? { statusCode } : {}),
    retryable: statusCode === 429 || statusCode === 503 || statusCode === 408,
    cause: error,
  });
}

function readStatusCode(error: unknown): number | undefined {
  if (error === null || typeof error !== "object") {
    return undefined;
  }
  if ("status" in error && typeof error.status === "number") {
    return error.status;
  }
  if ("statusCode" in error && typeof error.statusCode === "number") {
    return error.statusCode;
  }
  return undefined;
}

function mapStatusToCode(statusCode: number | undefined): ProviderErrorCode {
  switch (statusCode) {
    case 401:
    case 403:
      return "provider_authentication";
    case 400:
    case 404:
    case 422:
      return "provider_invalid_request";
    case 408:
      return "provider_timeout";
    case 429:
      return "provider_rate_limited";
    case 503:
      return "provider_unavailable";
    default:
      return "provider_error";
  }
}
