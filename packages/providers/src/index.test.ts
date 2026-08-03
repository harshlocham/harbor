import { describe, expect, it } from "vitest";

import { fromOpenAIResponse, PACKAGE_NAME, toOpenAIMessages } from "./index.js";

describe("@harbor/providers", () => {
  it("exports PACKAGE_NAME and OpenAI mappers", () => {
    expect(PACKAGE_NAME).toBe("@harbor/providers");
    expect(typeof toOpenAIMessages).toBe("function");
    expect(typeof fromOpenAIResponse).toBe("function");
  });
});
