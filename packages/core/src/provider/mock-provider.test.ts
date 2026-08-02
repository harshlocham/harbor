import { describe, expect, it } from "vitest";

import type { RunContext } from "../runtime/context.js";

import { MockProvider } from "./mock-provider.js";

const context: RunContext = {
  runId: "run_1",
  agentName: "demo",
};

describe("MockProvider", () => {
  it("returns a normal assistant message by default", async () => {
    const provider = new MockProvider();
    const response = await provider.generate({ messages: [] }, context);

    expect(response.message.role).toBe("assistant");
    expect(response.message.content).toBe("ok");
    expect(response.finishReason).toBe("stop");
    expect(provider.requests).toHaveLength(1);
  });

  it("returns configured fallback content", async () => {
    const provider = new MockProvider({ content: "hello" });
    const response = await provider.generate({ messages: [] }, context);
    expect(response.message.content).toBe("hello");
  });

  it("returns tool calls when configured", async () => {
    const provider = new MockProvider({
      responses: [
        MockProvider.toolCalls([{ id: "call_1", name: "add", arguments: { a: 1, b: 2 } }]),
      ],
    });

    const response = await provider.generate({ messages: [] }, context);
    expect(response.finishReason).toBe("tool_calls");
    expect(response.message.toolCalls).toEqual([
      { id: "call_1", name: "add", arguments: { a: 1, b: 2 } },
    ]);
  });

  it("simulates multiple model responses in order", async () => {
    const provider = new MockProvider({
      responses: [
        MockProvider.toolCalls([{ id: "call_1", name: "noop", arguments: {} }]),
        MockProvider.text("done"),
      ],
    });

    const first = await provider.generate(
      { messages: [{ id: "u1", role: "user", content: "hi" }] },
      context,
    );
    const second = await provider.generate(
      {
        messages: [
          { id: "u1", role: "user", content: "hi" },
          { id: "t1", role: "tool", content: "ok", toolCallId: "call_1" },
        ],
      },
      context,
    );

    expect(first.finishReason).toBe("tool_calls");
    expect(second.message.content).toBe("done");
    expect(provider.requests).toHaveLength(2);
    expect(provider.pending).toBe(0);
  });

  it("supports enqueue for additional scripted turns", async () => {
    const provider = new MockProvider({ content: "fallback", strict: false });
    provider.enqueue(MockProvider.text("one"), MockProvider.text("two"));

    expect((await provider.generate({ messages: [] }, context)).message.content).toBe("one");
    expect((await provider.generate({ messages: [] }, context)).message.content).toBe("two");
    expect((await provider.generate({ messages: [] }, context)).message.content).toBe("fallback");
  });

  it("throws when a strict response queue is exhausted", async () => {
    const provider = new MockProvider({
      responses: [MockProvider.text("once")],
    });

    await provider.generate({ messages: [] }, context);
    await expect(provider.generate({ messages: [] }, context)).rejects.toMatchObject({
      code: "mock_provider_exhausted",
    });
  });

  it("supports response factories", async () => {
    const provider = new MockProvider({
      responses: [(request) => MockProvider.text(`echo:${request.messages.at(-1)?.content ?? ""}`)],
    });

    const response = await provider.generate(
      { messages: [{ id: "u1", role: "user", content: "ping" }] },
      context,
    );
    expect(response.message.content).toBe("echo:ping");
  });
});
