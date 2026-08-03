/**
 * @harbor/providers — provider adapters and vendor mappers for Harbor.
 */

/** Package name constant. */
export const PACKAGE_NAME = "@harbor/providers" as const;

export { fromOpenAIResponse, toOpenAIMessage, toOpenAIMessages } from "./openai/index.js";
export type {
  OpenAIChatCompletionChoice,
  OpenAIChatCompletionResponse,
  OpenAIChatCompletionUsage,
  OpenAIChatMessage,
  OpenAIChatRole,
  OpenAIChatToolCall,
} from "./openai/index.js";
