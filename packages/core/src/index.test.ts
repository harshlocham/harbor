import { describe, expect, it } from "vitest";

import { Agent, NotImplementedError, PACKAGE_NAME, Runtime } from "./index.js";

describe("@harbor/core", () => {
  it("exports PACKAGE_NAME", () => {
    expect(PACKAGE_NAME).toBe("@harbor/core");
  });

  it("constructs an Agent with config", () => {
    const agent = new Agent({ name: "demo", instructions: "Be helpful." });
    expect(agent.name).toBe("demo");
    expect(agent.config.instructions).toBe("Be helpful.");
  });

  it("Runtime.run throws NotImplementedError", async () => {
    const runtime = new Runtime(new Agent({ name: "demo" }));
    await expect(runtime.run({ input: "hello" })).rejects.toBeInstanceOf(NotImplementedError);
  });

  it("Runtime.resume throws NotImplementedError", async () => {
    const runtime = new Runtime(new Agent({ name: "demo" }));
    await expect(runtime.resume("run_1")).rejects.toBeInstanceOf(NotImplementedError);
  });

  it("Runtime.cancel throws NotImplementedError", async () => {
    const runtime = new Runtime(new Agent({ name: "demo" }));
    await expect(runtime.cancel("run_1")).rejects.toBeInstanceOf(NotImplementedError);
  });

  it("Runtime.stream throws NotImplementedError when consumed", async () => {
    const runtime = new Runtime(new Agent({ name: "demo" }));
    const iterator = runtime.stream({ input: "hello" })[Symbol.asyncIterator]();
    await expect(iterator.next()).rejects.toBeInstanceOf(NotImplementedError);
  });
});
