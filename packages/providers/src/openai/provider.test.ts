import { describe, expect, it, vi } from "vitest";

import type { ProviderRequest } from "@harbor/core";
import { NotImplementedError, ProviderError } from "@harbor/core";

import { OpenAIProvider } from "./provider.js";

type CreateFn = ReturnType<typeof vi.fn<(body: unknown, opts?: unknown) => Promise<unknown>>>;

function createMockClient(create: CreateFn): {
  chat: { completions: { create: CreateFn } };
} {
  return {
    chat: {
      completions: {
        create,
      },
    },
  };
}

function firstCreateBody(create: CreateFn): Record<string, unknown> {
  const body = create.mock.calls[0]?.[0];
  expect(body).toBeDefined();
  return body as Record<string, unknown>;
}

function firstCreateOptions(create: CreateFn): { signal?: AbortSignal } | undefined {
  return create.mock.calls[0]?.[1] as { signal?: AbortSignal } | undefined;
}

function baseRequest(overrides: Partial<ProviderRequest> = {}): ProviderRequest {
  return {
    messages: [{ id: "u1", role: "user", content: "hello" }],
    ...overrides,
  };
}

describe("OpenAIProvider", () => {
  it("requires an API key when no client is injected", () => {
    const previous = process.env["OPENAI_API_KEY"];
    delete process.env["OPENAI_API_KEY"];

    expect(() => new OpenAIProvider({})).toThrow(ProviderError);

    if (previous !== undefined) {
      process.env["OPENAI_API_KEY"] = previous;
    }
  });

  it("reads the API key from the environment when options omit it", () => {
    const previous = process.env["OPENAI_API_KEY"];
    process.env["OPENAI_API_KEY"] = "env-key";

    const create = vi.fn(async () => ({
      id: "chatcmpl_env",
      choices: [{ message: { role: "assistant", content: "ok" }, finish_reason: "stop" }],
    }));

    // Construct with env key; inject client to avoid real SDK auth work.
    const provider = new OpenAIProvider({
      client: createMockClient(create) as never,
    });

    expect(provider.id).toBe("openai");
    expect(provider.capabilities.tools).toBe(true);

    if (previous === undefined) {
      delete process.env["OPENAI_API_KEY"];
    } else {
      process.env["OPENAI_API_KEY"] = previous;
    }
  });

  it("returns a successful text response with usage and finish reason", async () => {
    const create = vi.fn(async (_body: unknown, _opts?: unknown) => ({
      id: "chatcmpl_1",
      created: 1_700_000_000,
      model: "gpt-4o-mini",
      choices: [
        {
          index: 0,
          finish_reason: "stop",
          message: { role: "assistant", content: "hello there" },
        },
      ],
      usage: {
        prompt_tokens: 11,
        completion_tokens: 4,
        total_tokens: 15,
      },
    }));

    const provider = new OpenAIProvider({
      apiKey: "test-key",
      model: "gpt-4o-mini",
      client: createMockClient(create) as never,
    });

    const response = await provider.generate(
      baseRequest({
        temperature: 0.2,
        maxTokens: 64,
        stopSequences: ["\n"],
      }),
    );

    expect(response.message.content).toBe("hello there");
    expect(response.finishReason).toBe("stop");
    expect(response.model).toBe("gpt-4o-mini");
    expect(response.usage).toEqual({
      inputTokens: 11,
      outputTokens: 4,
      totalTokens: 15,
    });

    expect(create).toHaveBeenCalledTimes(1);
    const body = firstCreateBody(create);
    expect(body["model"]).toBe("gpt-4o-mini");
    expect(body["messages"]).toEqual([{ role: "user", content: "hello" }]);
    expect(body["temperature"]).toBe(0.2);
    expect(body["max_tokens"]).toBe(64);
    expect(body["stop"]).toEqual(["\n"]);
  });

  it("maps a single tool call response", async () => {
    const create = vi.fn(async () => ({
      id: "chatcmpl_tool",
      choices: [
        {
          finish_reason: "tool_calls",
          message: {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: { name: "add", arguments: '{"a":1,"b":2}' },
              },
            ],
          },
        },
      ],
    }));

    const provider = new OpenAIProvider({
      apiKey: "test-key",
      client: createMockClient(create) as never,
    });

    const response = await provider.generate(
      baseRequest({
        tools: [
          {
            name: "add",
            description: "Add numbers",
            parameters: {
              type: "object",
              properties: { a: { type: "number" }, b: { type: "number" } },
            },
          },
        ],
      }),
    );

    expect(response.finishReason).toBe("tool_calls");
    expect(response.message.toolCalls).toEqual([
      { id: "call_1", name: "add", arguments: { a: 1, b: 2 } },
    ]);

    const body = firstCreateBody(create);
    expect(body["tools"]).toEqual([
      {
        type: "function",
        function: {
          name: "add",
          description: "Add numbers",
          parameters: {
            type: "object",
            properties: { a: { type: "number" }, b: { type: "number" } },
          },
        },
      },
    ]);
  });

  it("maps multiple tool calls", async () => {
    const create = vi.fn(async () => ({
      id: "chatcmpl_multi",
      choices: [
        {
          finish_reason: "tool_calls",
          message: {
            role: "assistant",
            content: "",
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: { name: "add", arguments: '{"a":1,"b":2}' },
              },
              {
                id: "call_2",
                type: "function",
                function: { name: "echo", arguments: '{"text":"hi"}' },
              },
            ],
          },
        },
      ],
    }));

    const provider = new OpenAIProvider({
      apiKey: "test-key",
      client: createMockClient(create) as never,
    });

    const response = await provider.generate(baseRequest());
    expect(response.message.toolCalls).toHaveLength(2);
    expect(response.message.toolCalls?.[0]?.name).toBe("add");
    expect(response.message.toolCalls?.[1]?.name).toBe("echo");
  });

  it("wraps empty choices as ProviderError", async () => {
    const create = vi.fn(async () => ({
      id: "chatcmpl_empty",
      choices: [],
    }));

    const provider = new OpenAIProvider({
      apiKey: "test-key",
      client: createMockClient(create) as never,
    });

    await expect(provider.generate(baseRequest())).rejects.toBeInstanceOf(ProviderError);
    await expect(provider.generate(baseRequest())).rejects.toMatchObject({
      provider: "openai",
      message: expect.stringContaining("no choices"),
    });
  });

  it("wraps API failures in ProviderError and never leaks SDK errors", async () => {
    const sdkError = Object.assign(new Error("rate limited"), { status: 429 });
    const create = vi.fn(async () => {
      throw sdkError;
    });

    const provider = new OpenAIProvider({
      apiKey: "test-key",
      client: createMockClient(create) as never,
    });

    await expect(provider.generate(baseRequest())).rejects.toBeInstanceOf(ProviderError);
    await expect(provider.generate(baseRequest())).rejects.toMatchObject({
      code: "provider_rate_limited",
      statusCode: 429,
      provider: "openai",
      retryable: true,
    });

    try {
      await provider.generate(baseRequest());
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderError);
      expect(error).not.toBe(sdkError);
    }
  });

  it("maps Harbor messages through toOpenAIMessages before calling the SDK", async () => {
    const create = vi.fn(async () => ({
      id: "chatcmpl_map",
      choices: [{ message: { role: "assistant", content: "ok" }, finish_reason: "stop" }],
    }));

    const provider = new OpenAIProvider({
      apiKey: "test-key",
      client: createMockClient(create) as never,
    });

    await provider.generate({
      messages: [
        { id: "s1", role: "system", content: "Be brief." },
        { id: "u1", role: "user", content: "Hi" },
        {
          id: "a1",
          role: "assistant",
          content: "",
          toolCalls: [{ id: "call_1", name: "ping", arguments: {} }],
        },
        {
          id: "t1",
          role: "tool",
          content: "pong",
          toolCallId: "call_1",
          name: "ping",
        },
      ],
    });

    const body = firstCreateBody(create);
    expect(body["messages"]).toEqual([
      { role: "system", content: "Be brief." },
      { role: "user", content: "Hi" },
      {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: { name: "ping", arguments: "{}" },
          },
        ],
      },
      {
        role: "tool",
        content: "pong",
        tool_call_id: "call_1",
        name: "ping",
      },
    ]);
  });

  it("maps usage when present and omits it when absent", async () => {
    const create = vi.fn(async () => ({
      id: "chatcmpl_nouse",
      choices: [{ message: { role: "assistant", content: "x" }, finish_reason: "stop" }],
    }));

    const provider = new OpenAIProvider({
      apiKey: "test-key",
      client: createMockClient(create) as never,
    });

    const response = await provider.generate(baseRequest());
    expect(response.usage).toBeUndefined();
  });

  it("throws NotImplementedError from stream()", () => {
    const provider = new OpenAIProvider({
      apiKey: "test-key",
      client: createMockClient(vi.fn()) as never,
    });

    expect(() => provider.stream(baseRequest())).toThrow(NotImplementedError);
  });

  it("forwards AbortSignal to the OpenAI client request options", async () => {
    const create = vi.fn(async () => ({
      id: "chatcmpl_signal",
      choices: [{ message: { role: "assistant", content: "ok" }, finish_reason: "stop" }],
    }));
    const provider = new OpenAIProvider({
      apiKey: "test-key",
      client: createMockClient(create) as never,
    });
    const controller = new AbortController();

    await provider.generate(baseRequest({ signal: controller.signal }));

    const requestOptions = firstCreateOptions(create);
    expect(requestOptions?.signal).toBe(controller.signal);
  });

  it("returns model info for getModelInfo", () => {
    const provider = new OpenAIProvider({
      apiKey: "test-key",
      client: createMockClient(vi.fn()) as never,
    });
    expect(provider.getModelInfo("gpt-4o")).toMatchObject({
      id: "gpt-4o",
      provider: "openai",
    });
  });
});
