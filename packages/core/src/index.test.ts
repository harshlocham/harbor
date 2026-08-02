import { describe, expect, it } from "vitest";

import { Agent, MockProvider, PACKAGE_NAME } from "./index.js";

describe("@harbor/core", () => {
  it("exports PACKAGE_NAME", () => {
    expect(PACKAGE_NAME).toBe("@harbor/core");
  });

  it("constructs an Agent with config", () => {
    const agent = new Agent({
      name: "demo",
      instructions: "Be helpful.",
      provider: new MockProvider({ content: "hi" }),
    });
    expect(agent.name).toBe("demo");
    expect(agent.config.instructions).toBe("Be helpful.");
  });
});
