import { describe, expect, it } from "vitest";

import type { RunContext } from "../runtime/context.js";

import { ToolExecutor } from "./executor.js";
import type { Tool } from "./types.js";

const context: RunContext = {
  runId: "run_1",
  agentName: "demo",
};

describe("ToolExecutor", () => {
  it("returns unknown_tool without throwing", async () => {
    const executor = new ToolExecutor([]);
    const result = await executor.execute(
      { id: "call_1", name: "missing", arguments: {} },
      context,
    );

    expect(result.isError).toBe(true);
    expect(result.error?.code).toBe("unknown_tool");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.content).toContain("Unknown tool");
  });

  it("returns validation_error without throwing", async () => {
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

    const executor = new ToolExecutor([echo]);
    const result = await executor.execute({ id: "call_1", name: "echo", arguments: {} }, context);

    expect(result.isError).toBe(true);
    expect(result.error?.code).toBe("validation_error");
    expect(result.content).toContain("Missing required argument");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("returns execution_error when the tool throws", async () => {
    const boom: Tool = {
      name: "boom",
      description: "Always fails",
      parameters: { type: "object", properties: {} },
      execute: () => {
        throw new Error("kaboom");
      },
    };

    const executor = new ToolExecutor([boom]);
    const result = await executor.execute({ id: "call_1", name: "boom", arguments: {} }, context);

    expect(result.isError).toBe(true);
    expect(result.error?.code).toBe("execution_error");
    expect(result.content).toBe("kaboom");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("executes async tools and records duration", async () => {
    const wait: Tool = {
      name: "wait",
      description: "Resolves asynchronously",
      parameters: { type: "object", properties: {} },
      execute: async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 5);
        });
        return { ok: true };
      },
    };

    const executor = new ToolExecutor([wait]);
    const result = await executor.execute({ id: "call_1", name: "wait", arguments: {} }, context);

    expect(result.isError).toBeUndefined();
    expect(result.error).toBeUndefined();
    expect(result.content).toBe('{"ok":true}');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(executor.definitions()).toEqual([
      {
        name: "wait",
        description: "Resolves asynchronously",
        parameters: { type: "object", properties: {} },
      },
    ]);
  });
});
