/**
 * @harbor/providers — provider adapters and vendor mappers for Harbor.
 */

/** Package name constant. */
export const PACKAGE_NAME = "@harbor/providers" as const;

export {
  fromOpenAIResponse,
  mapOpenAIFinishReason,
  mapOpenAIUsage,
  OpenAIProvider,
  toOpenAIMessage,
  toOpenAIMessages,
  toOpenAITools,
  toProviderError,
} from "./openai/index.js";
export type {
  OpenAIChatCompletionChoice,
  OpenAIChatCompletionResponse,
  OpenAIChatCompletionUsage,
  OpenAIChatMessage,
  OpenAIChatRole,
  OpenAIChatToolCall,
  OpenAIChatToolDefinition,
  OpenAIProviderOptions,
} from "./openai/index.js";
