import { ToolError } from "../errors/tool-error.js";
import { ToolValidationError } from "../errors/tool-validation-error.js";
import type { RunContext } from "../runtime/context.js";

import type { Tool, ToolCall, ToolDefinition, ToolResult } from "./types.js";
import { validateToolArguments } from "./validate.js";

/**
 * Executes agent tools with lookup, schema validation, timing, and error capture.
 *
 * Tool handler failures are converted into {@link ToolResult} values and never
 * rethrown as raw errors.
 */
export class ToolExecutor {
  readonly #toolsByName: ReadonlyMap<string, Tool>;

  /**
   * @param tools - Executable tools available for this executor.
   */
  constructor(tools: readonly Tool[]) {
    this.#toolsByName = new Map(tools.map((tool) => [tool.name, tool]));
  }

  /**
   * Provider-facing tool definitions with execute handlers stripped.
   */
  definitions(): ToolDefinition[] {
    return [...this.#toolsByName.values()].map(({ name, description, parameters }) => ({
      name,
      description,
      parameters,
    }));
  }

  /**
   * Find, validate, and execute a tool call.
   *
   * Always resolves a {@link ToolResult}. Validation and execution failures are
   * returned as error results with a {@link ToolError}.
   *
   * @param toolCall - Tool call requested by the model.
   * @param context - Active run context.
   */
  async execute(toolCall: ToolCall, context: RunContext): Promise<ToolResult> {
    const startedAt = Date.now();
    const tool = this.#toolsByName.get(toolCall.name);

    if (tool === undefined) {
      const error = new ToolError(toolCall.name, `Unknown tool "${toolCall.name}"`, {
        code: "unknown_tool",
        toolCallId: toolCall.id,
      });
      return errorResult(toolCall, error, elapsedMs(startedAt));
    }

    try {
      validateToolArguments(tool, toolCall.arguments);
      const output = await tool.execute(toolCall.arguments, context);
      return {
        toolCallId: toolCall.id,
        name: toolCall.name,
        content: serializeToolOutput(output),
        durationMs: elapsedMs(startedAt),
      };
    } catch (cause) {
      const error = toToolError(toolCall, cause);
      return errorResult(toolCall, error, elapsedMs(startedAt));
    }
  }
}

function elapsedMs(startedAt: number): number {
  return Math.max(0, Date.now() - startedAt);
}

function errorResult(toolCall: ToolCall, error: ToolError, durationMs: number): ToolResult {
  return {
    toolCallId: toolCall.id,
    name: toolCall.name,
    content: error.message,
    durationMs,
    isError: true,
    error,
  };
}

function toToolError(toolCall: ToolCall, cause: unknown): ToolError {
  if (cause instanceof ToolValidationError) {
    return new ToolError(toolCall.name, cause.message, {
      code: "validation_error",
      toolCallId: toolCall.id,
      cause,
    });
  }

  if (cause instanceof ToolError) {
    return cause;
  }

  const message =
    cause instanceof Error
      ? cause.message
      : typeof cause === "string"
        ? cause
        : "Tool execution failed";

  return new ToolError(toolCall.name, message, {
    code: "execution_error",
    toolCallId: toolCall.id,
    cause,
  });
}

function serializeToolOutput(output: unknown): string {
  if (typeof output === "string") {
    return output;
  }
  try {
    return JSON.stringify(output ?? null);
  } catch {
    return String(output);
  }
}
