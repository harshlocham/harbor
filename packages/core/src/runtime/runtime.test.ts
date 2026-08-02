import { describe, expect, it, vi } from "vitest";

import { Agent } from "../agent/agent.js";
import { HarborError } from "../errors/harbor-error.js";
import { MaxIterationsExceededError } from "../errors/max-iterations-exceeded-error.js";
import { NotImplementedError } from "../errors/not-implemented-error.js";
import type { Message } from "../message/types.js";
import { MockProvider } from "../provider/mock-provider.js";
import type { Tool } from "../tool/types.js";

import type { RuntimeEvent } from "./events.js";
import { Runtime } from "./runtime.js";

function collectEvents(): {
  events: RuntimeEvent[];
  onEvent: (event: RuntimeEvent) => void;
} {
  const events: RuntimeEvent[] = [];
  return {
    events,
    onEvent: (event) => {
      events.push(event);
    },
  };
}

function echoTool(): Tool {
  return {
    name: "echo",
    description: "Echo text",
    parameters: {
      type: "object",
      required: ["text"],
      properties: { text: { type: "string" } },
    },
    execute: ({ text }) => String(text),
  };
}

function addTool(): Tool {
  return {
    name: "add",
    description: "Add two numbers",
    parameters: {
      type: "object",
      required: ["a", "b"],
      properties: {
        a: { type: "number" },
        b: { type: "number" },
      },
    },
    execute: ({ a, b }) => (a as number) + (b as number),
  };
}

function boomTool(): Tool {
  return {
    name: "boom",
    description: "Always fails",
    parameters: { type: "object", properties: {} },
    execute: () => {
      throw new Error("tool exploded");
    },
  };
}

describe("Runtime.run", () => {
  it("returns a final response without tools", async () => {
    const { events, onEvent } = collectEvents();
    const provider = new MockProvider({ content: "hello world" });
    const agent = new Agent({
      name: "assistant",
      instructions: "Be concise.",
      model: "mock-model",
      metadata: { tier: "test" },
      provider,
    });

    const result = await new Runtime({ onEvent }).run({
      agent,
      input: "hi",
      sessionId: "sess_1",
      metadata: { requestId: "req_1" },
    });

    expect(result.status).toBe("completed");
    expect(result.output?.content).toBe("hello world");
    expect(result.messages.map((message) => message.role)).toEqual(["system", "user", "assistant"]);
    expect(result.trace?.runId).toBe(result.runId);
    expect(result.trace?.spans.some((span) => span.name === "provider.generate")).toBe(true);

    expect(provider.requests[0]?.model).toBe("mock-model");
    expect(provider.requests[0]?.metadata).toEqual({ tier: "test" });
    expect(provider.requests[0]?.tools).toBeUndefined();

    expect(events.map((event) => event.type)).toEqual([
      "run.start",
      "message",
      "message",
      "iteration.start",
      "provider.request",
      "provider.response",
      "message",
      "iteration.end",
      "run.end",
    ]);
  });

  it("executes a single tool and continues to a final answer", async () => {
    const provider = new MockProvider({
      responses: [
        MockProvider.toolCalls([{ id: "call_1", name: "echo", arguments: { text: "ping" } }]),
        (request) => {
          const toolMessage = request.messages.find((message) => message.role === "tool");
          expect(toolMessage?.content).toBe("ping");
          expect(toolMessage?.toolCallId).toBe("call_1");
          return MockProvider.text("pong");
        },
      ],
    });

    const { events, onEvent } = collectEvents();
    const agent = new Agent({ name: "demo", provider, tools: [echoTool()] });
    const result = await new Runtime().run({ agent, input: "echo ping", onEvent });

    expect(result.status).toBe("completed");
    expect(result.output?.content).toBe("pong");
    expect(result.messages.filter((message) => message.role === "tool")).toHaveLength(1);
    expect(events.some((event) => event.type === "tool.start")).toBe(true);
    expect(events.some((event) => event.type === "tool.end")).toBe(true);
    expect(
      result.trace?.spans.some((span) => span.name === "tool.execute" && span.status === "ok"),
    ).toBe(true);
    expect(provider.requests[0]?.tools?.[0]?.name).toBe("echo");
  });

  it("executes multiple tools in one assistant turn", async () => {
    const provider = new MockProvider({
      responses: [
        MockProvider.toolCalls([
          { id: "call_1", name: "add", arguments: { a: 2, b: 3 } },
          { id: "call_2", name: "echo", arguments: { text: "hi" } },
        ]),
        (request) => {
          const toolMessages = request.messages.filter((message) => message.role === "tool");
          expect(toolMessages).toHaveLength(2);
          expect(toolMessages[0]?.content).toBe("5");
          expect(toolMessages[1]?.content).toBe("hi");
          return MockProvider.text("done");
        },
      ],
    });

    const agent = new Agent({
      name: "multi",
      provider,
      tools: [addTool(), echoTool()],
    });
    const result = await new Runtime().run({ agent, input: "do both" });

    expect(result.status).toBe("completed");
    expect(result.output?.content).toBe("done");
    expect(result.messages.filter((message) => message.role === "tool")).toHaveLength(2);
    expect(result.trace?.spans.filter((span) => span.name === "tool.execute")).toHaveLength(2);
  });

  it("converts invalid tool input into a tool error message and continues", async () => {
    const provider = new MockProvider({
      responses: [
        MockProvider.toolCalls([{ id: "call_1", name: "echo", arguments: { text: 123 } }]),
        (request) => {
          const toolMessage = request.messages.find((message) => message.role === "tool");
          expect(toolMessage?.content).toContain('expected type "string"');
          expect(toolMessage?.metadata).toMatchObject({
            isError: true,
            errorCode: "validation_error",
          });
          return MockProvider.text("recovered");
        },
      ],
    });

    const agent = new Agent({ name: "demo", provider, tools: [echoTool()] });
    const result = await new Runtime().run({ agent, input: "bad args" });

    expect(result.status).toBe("completed");
    expect(result.output?.content).toBe("recovered");
    expect(
      result.trace?.spans.some((span) => span.name === "tool.execute" && span.status === "error"),
    ).toBe(true);
  });

  it("converts tool failures into tool error messages and continues", async () => {
    const provider = new MockProvider({
      responses: [
        MockProvider.toolCalls([{ id: "call_1", name: "boom", arguments: {} }]),
        (request) => {
          const toolMessage = request.messages.find((message) => message.role === "tool");
          expect(toolMessage?.content).toBe("tool exploded");
          expect(toolMessage?.metadata).toMatchObject({
            isError: true,
            errorCode: "execution_error",
          });
          return MockProvider.text("handled failure");
        },
      ],
    });

    const agent = new Agent({ name: "demo", provider, tools: [boomTool()] });
    const result = await new Runtime().run({ agent, input: "explode" });

    expect(result.status).toBe("completed");
    expect(result.output?.content).toBe("handled failure");
  });

  it("converts unknown tools into tool error messages and continues", async () => {
    const provider = new MockProvider({
      responses: [
        MockProvider.toolCalls([{ id: "call_1", name: "missing", arguments: {} }]),
        (request) => {
          const toolMessage = request.messages.find((message) => message.role === "tool");
          expect(toolMessage?.content).toContain('Unknown tool "missing"');
          expect(toolMessage?.metadata).toMatchObject({
            isError: true,
            errorCode: "unknown_tool",
          });
          return MockProvider.text("no such tool");
        },
      ],
    });

    const agent = new Agent({ name: "demo", provider, tools: [echoTool()] });
    const result = await new Runtime().run({ agent, input: "call missing" });

    expect(result.status).toBe("completed");
    expect(result.output?.content).toBe("no such tool");
  });

  it("throws MaxIterationsExceededError when the loop never finishes", async () => {
    const provider = new MockProvider({
      strict: false,
      responses: [
        MockProvider.toolCalls([{ id: "call_1", name: "echo", arguments: { text: "a" } }]),
        MockProvider.toolCalls([{ id: "call_2", name: "echo", arguments: { text: "b" } }]),
        MockProvider.toolCalls([{ id: "call_3", name: "echo", arguments: { text: "c" } }]),
      ],
    });
    const { events, onEvent } = collectEvents();
    const agent = new Agent({
      name: "loop",
      provider,
      tools: [echoTool()],
      maxIterations: 2,
    });

    await expect(new Runtime().run({ agent, input: "loop", onEvent })).rejects.toBeInstanceOf(
      MaxIterationsExceededError,
    );

    expect(events.some((event) => event.type === "error")).toBe(true);
    expect(events.some((event) => event.type === "run.end")).toBe(true);
    const end = events.find((event) => event.type === "run.end");
    expect(end?.type === "run.end" && end.result.status).toBe("failed");
  });

  it("supports empty string input", async () => {
    const provider = new MockProvider({ content: "empty ok" });
    const agent = new Agent({ name: "demo", provider });
    const result = await new Runtime().run({ agent, input: "" });

    expect(result.status).toBe("completed");
    expect(result.messages.filter((message) => message.role === "user")).toEqual([
      expect.objectContaining({ content: "" }),
    ]);
    expect(result.output?.content).toBe("empty ok");
  });

  it("supports empty message-array input", async () => {
    const provider = new MockProvider({ content: "no user turns" });
    const agent = new Agent({ name: "demo", provider });
    const result = await new Runtime().run({ agent, input: [] });

    expect(result.status).toBe("completed");
    expect(result.messages.map((message) => message.role)).toEqual(["assistant"]);
    expect(provider.requests[0]?.messages).toEqual([]);
  });

  it("supports a single Message input", async () => {
    const input: Message = {
      id: "m1",
      role: "user",
      content: "from message",
    };
    const provider = new MockProvider({
      responses: [
        (request) => {
          expect(request.messages).toEqual([
            expect.objectContaining({ id: "m1", content: "from message" }),
          ]);
          return MockProvider.text("acked");
        },
      ],
    });
    const agent = new Agent({ name: "demo", provider });
    const result = await new Runtime().run({ agent, input });
    expect(result.output?.content).toBe("acked");
  });

  it("wraps provider failures as HarborError with status failed", async () => {
    const provider = new MockProvider({
      responses: [
        () => {
          throw new Error("upstream down");
        },
      ],
    });
    const { events, onEvent } = collectEvents();
    const agent = new Agent({ name: "demo", provider });

    await expect(new Runtime().run({ agent, input: "hi", onEvent })).rejects.toMatchObject({
      code: "provider_error",
      message: "upstream down",
    });

    const end = events.find((event) => event.type === "run.end");
    expect(end?.type === "run.end" && end.result.status).toBe("failed");
    expect(
      end?.type === "run.end" &&
        end.result.trace?.spans.some(
          (span) => span.name === "provider.generate" && span.status === "error",
        ),
    ).toBe(true);
  });

  it("treats an empty toolCalls array as a final assistant answer", async () => {
    const provider = new MockProvider({
      responses: [
        {
          message: {
            id: "a1",
            role: "assistant",
            content: "no tools",
            toolCalls: [],
          },
          finishReason: "stop",
        },
      ],
    });
    const agent = new Agent({ name: "demo", provider, tools: [echoTool()] });
    const result = await new Runtime().run({ agent, input: "hi" });

    expect(result.status).toBe("completed");
    expect(result.output?.content).toBe("no tools");
    expect(result.messages.some((message) => message.role === "tool")).toBe(false);
  });

  it("accepts a message list as input", async () => {
    const provider = new MockProvider({ content: "listed" });
    const agent = new Agent({ name: "demo", provider });
    const result = await new Runtime().run({
      agent,
      input: [
        { id: "u1", role: "user", content: "one" },
        { id: "u2", role: "user", content: "two" },
      ],
    });

    expect(result.messages.filter((message) => message.role === "user")).toHaveLength(2);
    expect(result.output?.content).toBe("listed");
  });

  it("preserves HarborError thrown by the provider", async () => {
    const provider = new MockProvider({
      responses: [
        () => {
          throw new HarborError("quota exceeded", { code: "quota_exceeded" });
        },
      ],
    });
    const agent = new Agent({ name: "demo", provider });

    await expect(new Runtime().run({ agent, input: "hi" })).rejects.toMatchObject({
      code: "quota_exceeded",
      message: "quota exceeded",
    });
  });

  it("wraps non-Error provider failures", async () => {
    const provider = new MockProvider({
      responses: [
        () => {
          throw "string-failure";
        },
      ],
    });
    const agent = new Agent({ name: "demo", provider });

    await expect(new Runtime().run({ agent, input: "hi" })).rejects.toMatchObject({
      code: "provider_error",
      message: "string-failure",
    });
  });

  it("marks the run cancelled when aborted before provider call", async () => {
    const provider = new MockProvider({ content: "should not run" });
    const agent = new Agent({ name: "demo", provider });
    const controller = new AbortController();
    controller.abort();
    const { events, onEvent } = collectEvents();

    await expect(
      new Runtime().run({ agent, input: "hi", signal: controller.signal, onEvent }),
    ).rejects.toMatchObject({
      name: "HarborError",
    });

    const end = events.find((event) => event.type === "run.end");
    expect(end?.type === "run.end" && end.result.status).toBe("cancelled");
    expect(provider.requests).toHaveLength(0);
  });

  it("marks the run cancelled when aborted before tool execution", async () => {
    const controller = new AbortController();
    const provider = new MockProvider({
      responses: [
        () => {
          controller.abort();
          return MockProvider.toolCalls([
            { id: "call_1", name: "echo", arguments: { text: "hi" } },
          ]);
        },
      ],
    });
    const { events, onEvent } = collectEvents();
    const agent = new Agent({ name: "demo", provider, tools: [echoTool()] });

    await expect(
      new Runtime().run({
        agent,
        input: "hi",
        signal: controller.signal,
        onEvent,
      }),
    ).rejects.toMatchObject({ name: "HarborError" });

    const end = events.find((event) => event.type === "run.end");
    expect(end?.type === "run.end" && end.result.status).toBe("cancelled");
  });

  it("uses runtime default maxIterations when not set on options or agent", async () => {
    const provider = new MockProvider({
      strict: false,
      responses: [
        MockProvider.toolCalls([{ id: "c1", name: "echo", arguments: { text: "1" } }]),
        MockProvider.toolCalls([{ id: "c2", name: "echo", arguments: { text: "2" } }]),
      ],
    });
    const agent = new Agent({ name: "demo", provider, tools: [echoTool()] });

    await expect(
      new Runtime({ maxIterations: 1 }).run({ agent, input: "loop" }),
    ).rejects.toBeInstanceOf(MaxIterationsExceededError);
  });

  it("omits system message when instructions are empty", async () => {
    const provider = new MockProvider({ content: "ok" });
    const agent = new Agent({ name: "demo", instructions: "", provider });
    const result = await new Runtime().run({ agent, input: "hi" });

    expect(result.messages.map((message) => message.role)).toEqual(["user", "assistant"]);
  });
});

describe("Runtime unimplemented APIs", () => {
  it("stream rejects with NotImplementedError", async () => {
    const runtime = new Runtime();
    const iterator = runtime
      .stream({
        agent: new Agent({ name: "demo", provider: new MockProvider() }),
        input: "hi",
      })
      [Symbol.asyncIterator]();

    await expect(iterator.next()).rejects.toBeInstanceOf(NotImplementedError);
  });

  it("resume rejects with NotImplementedError", async () => {
    await expect(
      new Runtime().resume("run_1", {
        agent: new Agent({ name: "demo", provider: new MockProvider() }),
        input: "hi",
      }),
    ).rejects.toBeInstanceOf(NotImplementedError);
  });

  it("cancel rejects with NotImplementedError", async () => {
    await expect(new Runtime().cancel("run_1")).rejects.toBeInstanceOf(NotImplementedError);
  });
});

describe("Runtime event defaults", () => {
  it("uses RuntimeConfig.onEvent when run options omit onEvent", async () => {
    const onEvent = vi.fn();
    const runtime = new Runtime({ onEvent });
    const agent = new Agent({
      name: "demo",
      provider: new MockProvider({ content: "hi" }),
    });

    await runtime.run({ agent, input: "hi" });
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "run.start" }));
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "run.end" }));
  });
});
