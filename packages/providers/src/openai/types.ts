/**
 * OpenAI Chat Completions–compatible wire types.
 *
 * These are local structural types for mapping. They are intentionally NOT
 * imported from the OpenAI SDK so Harbor core stays free of vendor types.
 */

/**
 * Roles accepted by OpenAI chat message payloads.
 */
export type OpenAIChatRole = "system" | "user" | "assistant" | "tool" | "developer";

/**
 * OpenAI function tool call payload.
 */
export interface OpenAIChatToolCall {
  /**
   * Tool call identifier.
   */
  id: string;

  /**
   * OpenAI tool call type discriminator.
   */
  type: "function";

  /**
   * Function name and JSON-encoded arguments.
   */
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * OpenAI chat message wire shape used by Chat Completions.
 */
export type OpenAIChatMessage =
  | {
      role: "system" | "user" | "developer";
      content: string;
      name?: string;
    }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: OpenAIChatToolCall[];
      name?: string;
    }
  | {
      role: "tool";
      content: string;
      tool_call_id: string;
      name?: string;
    };

/**
 * A single choice in an OpenAI chat completion response.
 */
export interface OpenAIChatCompletionChoice {
  /**
   * Choice index.
   */
  index?: number;

  /**
   * Assistant message for this choice.
   */
  message: OpenAIChatMessage;

  /**
   * Provider finish reason string (e.g. `"stop"`, `"tool_calls"`).
   */
  finish_reason?: string | null;
}

/**
 * Token usage block from an OpenAI chat completion response.
 */
export interface OpenAIChatCompletionUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

/**
 * Minimal OpenAI chat completion response shape used by Harbor mappers.
 */
export interface OpenAIChatCompletionResponse {
  /**
   * Completion id.
   */
  id: string;

  /**
   * Unix epoch seconds when the completion was created.
   */
  created?: number;

  /**
   * Model id that produced the completion.
   */
  model?: string;

  /**
   * Completion choices.
   */
  choices: OpenAIChatCompletionChoice[];

  /**
   * Token usage, when present.
   */
  usage?: OpenAIChatCompletionUsage;
}
