import { describe, expect, it } from "vitest";

import type { Message } from "@harborts/core";

import { fromOpenAIResponse, toOpenAIMessages } from "./messages.js";
import type { OpenAIChatCompletionResponse } from "./types.js";

describe("OpenAI message mappers", () => {
  it("toOpenAIMessages maps system, user, assistant, and tool messages", () => {
    const messages: Message[] = [
      { id: "s1", role: "system", content: "Be helpful." },
      { id: "u1", role: "user", content: "Add 2 and 3", name: "alice" },
      {
        id: "a1",
        role: "assistant",
        content: "",
        toolCalls: [{ id: "call_1", name: "add", arguments: { a: 2, b: 3 } }],
      },
      {
        id: "t1",
        role: "tool",
        content: "5",
        toolCallId: "call_1",
        name: "add",
      },
    ];

    expect(toOpenAIMessages(messages)).toEqual([
      { role: "system", content: "Be helpful." },
      { role: "user", content: "Add 2 and 3", name: "alice" },
      {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: { name: "add", arguments: '{"a":2,"b":3}' },
          },
        ],
      },
      {
        role: "tool",
        content: "5",
        tool_call_id: "call_1",
        name: "add",
      },
    ]);
  });

  it("toOpenAIMessages requires toolCallId on tool messages", () => {
    const messages: Message[] = [{ id: "t1", role: "tool", content: "oops" }];
    expect(() => toOpenAIMessages(messages)).toThrow(/toolCallId/);
  });

  it("fromOpenAIResponse maps assistant text responses", () => {
    const response: OpenAIChatCompletionResponse = {
      id: "chatcmpl_1",
      created: 1_700_000_000,
      model: "gpt-test",
      choices: [
        {
          index: 0,
          finish_reason: "stop",
          message: { role: "assistant", content: "hello" },
        },
      ],
    };

    expect(fromOpenAIResponse(response)).toEqual({
      id: "chatcmpl_1",
      role: "assistant",
      content: "hello",
      createdAt: 1_700_000_000_000,
      metadata: {
        finishReason: "stop",
        model: "gpt-test",
      },
    });
  });

  it("fromOpenAIResponse maps tool calls and parses arguments JSON", () => {
    const response: OpenAIChatCompletionResponse = {
      id: "chatcmpl_2",
      choices: [
        {
          finish_reason: "tool_calls",
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "call_9",
                type: "function",
                function: { name: "echo", arguments: '{"text":"hi"}' },
              },
            ],
          },
        },
      ],
    };

    const message = fromOpenAIResponse(response);
    expect(message.content).toBe("");
    expect(message.toolCalls).toEqual([{ id: "call_9", name: "echo", arguments: { text: "hi" } }]);
    expect(message.metadata).toEqual({ finishReason: "tool_calls" });
  });

  it("fromOpenAIResponse falls back when tool arguments are invalid JSON", () => {
    const response: OpenAIChatCompletionResponse = {
      id: "chatcmpl_3",
      choices: [
        {
          message: {
            role: "assistant",
            content: "",
            tool_calls: [
              {
                id: "call_bad",
                type: "function",
                function: { name: "echo", arguments: "{not-json" },
              },
            ],
          },
        },
      ],
    };

    expect(fromOpenAIResponse(response).toolCalls?.[0]?.arguments).toEqual({
      raw: "{not-json",
    });
  });

  it("fromOpenAIResponse rejects empty choices", () => {
    expect(() => fromOpenAIResponse({ id: "x", choices: [] })).toThrow(/no choices/);
  });
});
