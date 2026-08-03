import { describe, expect, it } from "vitest";

import { ProviderError } from "../errors/provider-error.js";

import type { ModelProvider } from "./model-provider.js";
import type {
  ModelInfo,
  ProviderCapabilities,
  ProviderRequest,
  ProviderResponse,
  ProviderStreamEvent,
} from "./types.js";

/**
 * Minimal adapter used only to assert the ModelProvider contract compiles
 * and remains vendor-agnostic.
 */
class FakeProvider implements ModelProvider {
  readonly id = "fake";
  readonly capabilities: ProviderCapabilities = {
    streaming: false,
    tools: true,
    structuredOutput: true,
    systemMessage: true,
  };

  async generate(request: ProviderRequest): Promise<ProviderResponse> {
    const response: ProviderResponse = {
      message: {
        id: "a1",
        role: "assistant",
        content: `n=${String(request.messages.length)}`,
      },
      finishReason: "stop",
    };
    if (request.model !== undefined) {
      response.model = request.model;
    }
    return response;
  }

  stream(_request: ProviderRequest): AsyncIterable<ProviderStreamEvent> {
    const providerId = this.id;
    return {
      [Symbol.asyncIterator]() {
        return {
          next() {
            return Promise.reject(
              new ProviderError("streaming unsupported", {
                code: "provider_not_supported",
                provider: providerId,
              }),
            );
          },
        };
      },
    };
  }

  getModelInfo(modelId: string): ModelInfo {
    return {
      id: modelId,
      provider: this.id,
      capabilities: this.capabilities,
    };
  }
}

describe("ModelProvider contract", () => {
  it("supports generate(request) without vendor types", async () => {
    const provider: ModelProvider = new FakeProvider();
    const response = await provider.generate({
      messages: [{ id: "u1", role: "user", content: "hi" }],
      model: "fake-1",
      temperature: 0.5,
      maxTokens: 64,
      tools: [
        {
          name: "ping",
          description: "Ping",
          parameters: { type: "object", properties: {} },
        },
      ],
      responseFormat: { type: "json_object" },
    });

    expect(response.message.content).toBe("n=1");
    expect(response.model).toBe("fake-1");
    expect(provider.capabilities.tools).toBe(true);
    const modelInfo = await provider.getModelInfo?.("fake-1");
    expect(modelInfo?.provider).toBe("fake");
  });

  it("allows stream(request) to signal unsupported capability", async () => {
    const provider: ModelProvider = new FakeProvider();
    await expect(async () => {
      for await (const _event of provider.stream({ messages: [] })) {
        // drain
      }
    }).rejects.toBeInstanceOf(ProviderError);
  });
});
