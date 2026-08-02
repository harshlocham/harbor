import { describe, expect, it, vi } from "vitest";

import {
  Agent,
  MaxIterationsExceededError,
  NotImplementedError,
  PACKAGE_NAME,
  Runtime,
  type ModelProvider,
  type ProviderRequest,
  type ProviderResponse,
  type RuntimeEvent,
  type Tool,
} from "./index.js";

function createProvider(
  handler: (request: ProviderRequest) => ProviderResponse | Promise<ProviderResponse>,
): ModelProvider {
  return {
    generate: async (request) => handler(request),
  };
}

describe("@harbor/core", () => {
  it("exports PACKAGE_NAME", () => {
    expect(PACKAGE_NAME).toBe("@harbor/core");
  });

  it("constructs an Agent with config", () => {
    const provider = createProvider(() => ({
      message: { id: "a1", role: "assistant", content: "hi" },
    }));
    const agent = new Agent({
      name: "demo",
      instructions: "Be helpful.",
      provider,
    });
    expect(agent.name).toBe("demo");
    expect(agent.config.instructions).toBe("Be helpful.");
  });

  it("Runtime.run returns a final answer with system + user messages", async () => {
    const provider = createProvider((request) => {
      expect(request.messages[0]?.role).toBe("system");
      expect(request.messages[1]?.role).toBe("user");
      expect(request.messages[1]?.content).toBe("hello");
      return {
        message: { id: "a1", role: "assistant", content: "world" },
        finishReason: "stop",
      };
    });

    const agent = new Agent({
      name: "demo",
      instructions: "You are helpful.",
      provider,
    });
    const runtime = new Runtime();
    const result = await runtime.run({ agent, input: "hello", sessionId: "sess_1" });

    expect(result.status).toBe("completed");
    expect(result.output?.content).toBe("world");
    expect(result.messages.map((message) => message.role)).toEqual(["system", "user", "assistant"]);
    expect(result.trace?.spans.some((span) => span.name === "provider.generate")).toBe(true);
  });

  it("Runtime.run executes tools and continues the loop", async () => {
    let calls = 0;
    const add: Tool = {
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
      execute: ({ a, b }) => {
        expect(typeof a).toBe("number");
        expect(typeof b).toBe("number");
        return (a as number) + (b as number);
      },
    };

    const provider = createProvider((request) => {
      calls += 1;
      if (calls === 1) {
        return {
          finishReason: "tool_calls",
          message: {
            id: "a1",
            role: "assistant",
            content: "",
            toolCalls: [
              {
                id: "call_1",
                name: "add",
                arguments: { a: 2, b: 3 },
              },
            ],
          },
        };
      }

      const toolMessage = request.messages.find((message) => message.role === "tool");
      expect(toolMessage?.content).toBe("5");
      return {
        finishReason: "stop",
        message: { id: "a2", role: "assistant", content: "sum is 5" },
      };
    });

    const events: RuntimeEvent[] = [];
    const agent = new Agent({ name: "math", provider, tools: [add] });
    const runtime = new Runtime();
    const result = await runtime.run({
      agent,
      input: "2+3?",
      onEvent: (event) => {
        events.push(event);
      },
    });

    expect(result.status).toBe("completed");
    expect(result.output?.content).toBe("sum is 5");
    expect(events.some((event) => event.type === "tool.start")).toBe(true);
    expect(events.some((event) => event.type === "tool.end")).toBe(true);
    expect(events.some((event) => event.type === "run.end")).toBe(true);
    expect(result.trace?.spans.some((span) => span.name === "tool.execute")).toBe(true);
  });

  it("Runtime.run converts tool validation errors into tool messages", async () => {
    let calls = 0;
    const echo: Tool = {
      name: "echo",
      description: "Echo text",
      parameters: {
        type: "object",
        required: ["text"],
        properties: { text: { type: "string" } },
      },
      execute: ({ text }) => text,
    };

    const provider = createProvider((request) => {
      calls += 1;
      if (calls === 1) {
        return {
          finishReason: "tool_calls",
          message: {
            id: "a1",
            role: "assistant",
            content: "",
            toolCalls: [{ id: "call_1", name: "echo", arguments: {} }],
          },
        };
      }
      const toolMessage = request.messages.find((message) => message.role === "tool");
      expect(toolMessage?.content).toContain("Missing required argument");
      return {
        message: { id: "a2", role: "assistant", content: "failed validation" },
      };
    });

    const agent = new Agent({ name: "demo", provider, tools: [echo] });
    const result = await new Runtime().run({ agent, input: "echo" });
    expect(result.status).toBe("completed");
    expect(result.messages.some((message) => message.role === "tool")).toBe(true);
  });

  it("Runtime.run throws MaxIterationsExceededError", async () => {
    const provider = createProvider(() => ({
      finishReason: "tool_calls",
      message: {
        id: "a1",
        role: "assistant",
        content: "",
        toolCalls: [{ id: "call_1", name: "noop", arguments: {} }],
      },
    }));

    const noop: Tool = {
      name: "noop",
      description: "No-op",
      parameters: { type: "object", properties: {} },
      execute: () => "ok",
    };

    const agent = new Agent({ name: "loop", provider, tools: [noop] });
    const runtime = new Runtime();

    await expect(runtime.run({ agent, input: "loop", maxIterations: 2 })).rejects.toBeInstanceOf(
      MaxIterationsExceededError,
    );
  });

  it("Runtime.resume throws NotImplementedError", async () => {
    const provider = createProvider(() => ({
      message: { id: "a1", role: "assistant", content: "hi" },
    }));
    const runtime = new Runtime();
    await expect(
      runtime.resume("run_1", { agent: new Agent({ name: "demo", provider }), input: "x" }),
    ).rejects.toBeInstanceOf(NotImplementedError);
  });

  it("Runtime.cancel throws NotImplementedError", async () => {
    const runtime = new Runtime();
    await expect(runtime.cancel("run_1")).rejects.toBeInstanceOf(NotImplementedError);
  });

  it("Runtime.stream throws NotImplementedError when consumed", async () => {
    const provider = createProvider(() => ({
      message: { id: "a1", role: "assistant", content: "hi" },
    }));
    const runtime = new Runtime();
    const iterator = runtime
      .stream({
        agent: new Agent({ name: "demo", provider }),
        input: "hello",
      })
      [Symbol.asyncIterator]();
    await expect(iterator.next()).rejects.toBeInstanceOf(NotImplementedError);
  });

  it("Runtime.run records provider failures as HarborError", async () => {
    const provider = createProvider(() => {
      throw new Error("boom");
    });
    const agent = new Agent({ name: "demo", provider });
    const onEvent = vi.fn();
    await expect(new Runtime().run({ agent, input: "hi", onEvent })).rejects.toMatchObject({
      code: "provider_error",
      message: "boom",
    });
    expect(onEvent).toHaveBeenCalledWith(expect.objectContaining({ type: "error" }));
  });
});
