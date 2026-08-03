import { describe, expect, it } from "vitest";

import { fromOpenAIResponse, OpenAIProvider, PACKAGE_NAME, toOpenAIMessages } from "./index.js";

describe("@harbor/providers", () => {
  it("exports PACKAGE_NAME, OpenAIProvider, and OpenAI mappers", () => {
    expect(PACKAGE_NAME).toBe("@harbor/providers");
    expect(OpenAIProvider).toBeTypeOf("function");
    expect(typeof toOpenAIMessages).toBe("function");
    expect(typeof fromOpenAIResponse).toBe("function");
  });
});
