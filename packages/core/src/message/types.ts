import type { JsonObject } from "../types/json.js";
import type { ToolCall } from "../tool/types.js";

/**
 * Role of a message participant in a conversation.
 *
 * - `"system"`: instructions or policy for the agent
 * - `"user"`: end-user input
 * - `"assistant"`: model output (may include tool calls)
 * - `"tool"`: tool execution result
 */
export type MessageRole = "system" | "user" | "assistant" | "tool";

/**
 * A single message in a Harbor conversation transcript.
 */
export interface Message {
  /**
   * Unique message identifier.
   */
  id: string;

  /**
   * Speaker role for this message.
   */
  role: MessageRole;

  /**
   * Textual content of the message.
   */
  content: string;

  /**
   * Tool calls requested by an assistant message.
   */
  toolCalls?: ToolCall[];

  /**
   * For `"tool"` messages, the tool call this message answers.
   */
  toolCallId?: string;

  /**
   * Optional display or tool name associated with the message.
   */
  name?: string;

  /**
   * Unix epoch milliseconds when the message was created.
   */
  createdAt?: number;

  /**
   * Arbitrary provider-agnostic metadata.
   */
  metadata?: JsonObject;
}
