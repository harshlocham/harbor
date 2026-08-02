import { randomUUID } from "node:crypto";

import type { Message } from "../message/types.js";
import type { ToolCall, ToolResult } from "../tool/types.js";

/**
 * Create a system message.
 *
 * @param content - System instructions.
 */
export function createSystemMessage(content: string): Message {
  return {
    id: randomUUID(),
    role: "system",
    content,
    createdAt: Date.now(),
  };
}

/**
 * Normalize run input into one or more user/tool/assistant messages.
 *
 * Plain strings become a single user message.
 *
 * @param input - Run input.
 */
export function normalizeInput(input: string | Message | Message[]): Message[] {
  if (typeof input === "string") {
    return [
      {
        id: randomUUID(),
        role: "user",
        content: input,
        createdAt: Date.now(),
      },
    ];
  }
  if (Array.isArray(input)) {
    return input.map((message) => ({ ...message }));
  }
  return [{ ...input }];
}

/**
 * Convert a tool result into a conversation tool message.
 *
 * @param result - Tool execution result.
 */
export function toolResultToMessage(result: ToolResult): Message {
  const message: Message = {
    id: randomUUID(),
    role: "tool",
    content: result.content,
    toolCallId: result.toolCallId,
    name: result.name,
    createdAt: Date.now(),
  };
  if (result.isError === true) {
    message.metadata = { isError: true };
  }
  return message;
}

/**
 * Whether an assistant message contains tool calls to execute.
 *
 * @param message - Assistant message from the provider.
 */
export function hasToolCalls(message: Message): message is Message & { toolCalls: ToolCall[] } {
  return Array.isArray(message.toolCalls) && message.toolCalls.length > 0;
}
