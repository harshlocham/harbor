import { randomUUID } from "node:crypto";

import type { JsonObject, JsonValue, Message } from "@harbor/core";

import type {
  OpenAIChatCompletionResponse,
  OpenAIChatMessage,
  OpenAIChatToolCall,
} from "./types.js";

/**
 * Convert Harbor messages into OpenAI Chat Completions message payloads.
 *
 * @param messages - Harbor conversation messages.
 */
export function toOpenAIMessages(messages: readonly Message[]): OpenAIChatMessage[] {
  return messages.map(toOpenAIMessage);
}

/**
 * Convert a single Harbor message into an OpenAI chat message.
 *
 * @param message - Harbor message.
 */
export function toOpenAIMessage(message: Message): OpenAIChatMessage {
  switch (message.role) {
    case "system":
    case "user": {
      const mapped: OpenAIChatMessage = {
        role: message.role,
        content: message.content,
      };
      if (message.name !== undefined) {
        mapped.name = message.name;
      }
      return mapped;
    }
    case "assistant": {
      const mapped: Extract<OpenAIChatMessage, { role: "assistant" }> = {
        role: "assistant",
        content: message.content,
      };
      if (message.name !== undefined) {
        mapped.name = message.name;
      }
      if (message.toolCalls !== undefined && message.toolCalls.length > 0) {
        mapped.tool_calls = message.toolCalls.map(toOpenAIToolCall);
      }
      return mapped;
    }
    case "tool": {
      if (message.toolCallId === undefined) {
        throw new Error(
          `Harbor tool message "${message.id}" is missing toolCallId required by OpenAI`,
        );
      }
      const mapped: Extract<OpenAIChatMessage, { role: "tool" }> = {
        role: "tool",
        content: message.content,
        tool_call_id: message.toolCallId,
      };
      if (message.name !== undefined) {
        mapped.name = message.name;
      }
      return mapped;
    }
    default: {
      const _exhaustive: never = message.role;
      throw new Error(`Unsupported Harbor message role: ${String(_exhaustive)}`);
    }
  }
}

/**
 * Convert an OpenAI Chat Completions response into a Harbor assistant message.
 *
 * Uses `choices[0]`. Throws if no usable assistant choice is present.
 *
 * @param response - OpenAI-compatible chat completion response.
 */
export function fromOpenAIResponse(response: OpenAIChatCompletionResponse): Message {
  const choice = response.choices[0];
  if (choice === undefined) {
    throw new Error("OpenAI response contains no choices");
  }

  const openAIMessage = choice.message;
  if (openAIMessage.role !== "assistant") {
    throw new Error(
      `Expected OpenAI assistant message in choices[0], received role "${openAIMessage.role}"`,
    );
  }

  const message: Message = {
    id: response.id || randomUUID(),
    role: "assistant",
    content: openAIMessage.content ?? "",
    createdAt: response.created !== undefined ? response.created * 1000 : Date.now(),
  };

  if (openAIMessage.name !== undefined) {
    message.name = openAIMessage.name;
  }

  if (openAIMessage.tool_calls !== undefined && openAIMessage.tool_calls.length > 0) {
    message.toolCalls = openAIMessage.tool_calls.map(fromOpenAIToolCall);
  }

  const metadata: JsonObject = {};
  if (choice.finish_reason != null) {
    metadata["finishReason"] = choice.finish_reason;
  }
  if (response.model !== undefined) {
    metadata["model"] = response.model;
  }
  if (Object.keys(metadata).length > 0) {
    message.metadata = metadata;
  }

  return message;
}

function toOpenAIToolCall(toolCall: {
  id: string;
  name: string;
  arguments: JsonObject;
}): OpenAIChatToolCall {
  return {
    id: toolCall.id,
    type: "function",
    function: {
      name: toolCall.name,
      arguments: JSON.stringify(toolCall.arguments),
    },
  };
}

function fromOpenAIToolCall(toolCall: OpenAIChatToolCall): {
  id: string;
  name: string;
  arguments: JsonObject;
} {
  return {
    id: toolCall.id,
    name: toolCall.function.name,
    arguments: parseToolArguments(toolCall.function.arguments),
  };
}

function parseToolArguments(raw: string): JsonObject {
  if (raw.trim().length === 0) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as JsonObject;
    }
    return { value: parsed as JsonValue };
  } catch {
    return { raw };
  }
}
