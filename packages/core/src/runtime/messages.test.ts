import { describe, expect, it } from "vitest";

import { ToolError } from "../errors/tool-error.js";

import { hasToolCalls, toolResultToMessage } from "./messages.js";

describe("runtime message helpers", () => {
  it("hasToolCalls is false for missing or empty toolCalls", () => {
    expect(hasToolCalls({ id: "a1", role: "assistant", content: "x" })).toBe(false);
    expect(hasToolCalls({ id: "a1", role: "assistant", content: "x", toolCalls: [] })).toBe(false);
  });

  it("toolResultToMessage includes isError metadata without errorCode when error is absent", () => {
    const message = toolResultToMessage({
      toolCallId: "call_1",
      name: "echo",
      content: "failed",
      durationMs: 3,
      isError: true,
    });

    expect(message.metadata).toEqual({
      isError: true,
      durationMs: 3,
    });
  });

  it("toolResultToMessage includes errorCode when ToolError is present", () => {
    const message = toolResultToMessage({
      toolCallId: "call_1",
      name: "echo",
      content: "failed",
      durationMs: 3,
      isError: true,
      error: new ToolError("echo", "failed", {
        code: "execution_error",
        toolCallId: "call_1",
      }),
    });

    expect(message.metadata).toMatchObject({
      isError: true,
      errorCode: "execution_error",
    });
  });
});
