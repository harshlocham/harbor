import { describe, expect, it } from "vitest";

import { MockProvider } from "./mock-provider.js";

describe("MockProvider", () => {
  it("exposes provider-agnostic identity and capabilities", () => {
    const provider = new MockProvider();
    expect(provider.id).toBe("mock");
    expect(provider.capabilities).toMatchObject({
      streaming: true,
      tools: true,
      structuredOutput: false,
    });
    expect(provider.getModelInfo("mock-model")).toMatchObject({
      id: "mock-model",
      provider: "mock",
    });
  });

  it("returns a normal assistant message by default", async () => {
    const provider = new MockProvider();
    const response = await provider.generate({ messages: [] });

    expect(response.message.role).toBe("assistant");
    expect(response.message.content).toBe("ok");
    expect(response.finishReason).toBe("stop");
    expect(provider.requests).toHaveLength(1);
  });

  it("returns configured fallback content", async () => {
    const provider = new MockProvider({ content: "hello" });
    const response = await provider.generate({ messages: [] });
    expect(response.message.content).toBe("hello");
  });

  it("returns tool calls when configured", async () => {
    const provider = new MockProvider({
      responses: [
        MockProvider.toolCalls([{ id: "call_1", name: "add", arguments: { a: 1, b: 2 } }]),
      ],
    });

    const response = await provider.generate({ messages: [] });
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

    const first = await provider.generate({
      messages: [{ id: "u1", role: "user", content: "hi" }],
    });
    const second = await provider.generate({
      messages: [
        { id: "u1", role: "user", content: "hi" },
        { id: "t1", role: "tool", content: "ok", toolCallId: "call_1" },
      ],
    });

    expect(first.finishReason).toBe("tool_calls");
    expect(second.message.content).toBe("done");
    expect(provider.requests).toHaveLength(2);
    expect(provider.pending).toBe(0);
  });

  it("supports enqueue for additional scripted turns", async () => {
    const provider = new MockProvider({ content: "fallback", strict: false });
    provider.enqueue(MockProvider.text("one"), MockProvider.text("two"));

    expect((await provider.generate({ messages: [] })).message.content).toBe("one");
    expect((await provider.generate({ messages: [] })).message.content).toBe("two");
    expect((await provider.generate({ messages: [] })).message.content).toBe("fallback");
  });

  it("throws ProviderError when a strict response queue is exhausted", async () => {
    const provider = new MockProvider({
      responses: [MockProvider.text("once")],
    });

    await provider.generate({ messages: [] });
    await expect(provider.generate({ messages: [] })).rejects.toMatchObject({
      name: "ProviderError",
      code: "provider_invalid_request",
    });
  });

  it("supports response factories", async () => {
    const provider = new MockProvider({
      responses: [(request) => MockProvider.text(`echo:${request.messages.at(-1)?.content ?? ""}`)],
    });

    const response = await provider.generate({
      messages: [{ id: "u1", role: "user", content: "ping" }],
    });
    expect(response.message.content).toBe("echo:ping");
  });

  it("streams deltas and a done event", async () => {
    const provider = new MockProvider({
      responses: [MockProvider.text("abcdef")],
    });

    const events = [];
    for await (const event of provider.stream({ messages: [] })) {
      events.push(event);
    }

    expect(events.some((event) => event.type === "delta")).toBe(true);
    expect(events.at(-1)).toMatchObject({
      type: "done",
      response: { message: { content: "abcdef" } },
    });
  });

  it("rejects streaming when capability is disabled", async () => {
    const provider = new MockProvider({
      content: "x",
      capabilities: { streaming: false, tools: true, structuredOutput: false },
    });

    await expect(async () => {
      for await (const _event of provider.stream({ messages: [] })) {
        // drain
      }
    }).rejects.toMatchObject({
      code: "provider_not_supported",
    });
  });

  it("accepts structured-output fields for future compatibility", async () => {
    const provider = new MockProvider({
      responses: [
        MockProvider.text("{}", {
          structuredOutput: { ok: true },
          finishReason: "stop",
        }),
      ],
    });

    const response = await provider.generate({
      messages: [],
      responseFormat: {
        type: "json_schema",
        name: "Result",
        schema: {
          type: "object",
          properties: { ok: { type: "boolean" } },
        },
      },
      temperature: 0.2,
      maxTokens: 128,
    });

    expect(response.structuredOutput).toEqual({ ok: true });
    expect(provider.requests[0]?.responseFormat?.type).toBe("json_schema");
    expect(provider.requests[0]?.temperature).toBe(0.2);
    expect(provider.requests[0]?.maxTokens).toBe(128);
  });
});
