import { HarborError } from "../errors/harbor-error.js";
import { ToolValidationError } from "../errors/tool-validation-error.js";
import type { Tool, ToolCall, ToolDefinition, ToolResult } from "../tool/types.js";
import { validateToolArguments } from "../tool/validate.js";
import type { RunContext } from "./context.js";

/**
 * Strip executable handlers and return provider-facing tool definitions.
 *
 * @param tools - Executable tools.
 */
export function toToolDefinitions(tools: readonly Tool[]): ToolDefinition[] {
  return tools.map(({ name, description, parameters }) => ({
    name,
    description,
    parameters,
  }));
}

/**
 * Execute a single tool call with validation and error conversion.
 *
 * Validation/execution failures become error tool results instead of throwing.
 *
 * @param toolCall - Tool call requested by the model.
 * @param toolsByName - Lookup of executable tools.
 * @param context - Active run context.
 */
export async function executeToolCall(
  toolCall: ToolCall,
  toolsByName: ReadonlyMap<string, Tool>,
  context: RunContext,
): Promise<ToolResult> {
  const tool = toolsByName.get(toolCall.name);
  if (tool === undefined) {
    return {
      toolCallId: toolCall.id,
      name: toolCall.name,
      content: `Unknown tool "${toolCall.name}"`,
      isError: true,
    };
  }

  try {
    validateToolArguments(tool, toolCall.arguments);
    const output = await tool.execute(toolCall.arguments, context);
    return {
      toolCallId: toolCall.id,
      name: toolCall.name,
      content: serializeToolOutput(output),
    };
  } catch (error) {
    return {
      toolCallId: toolCall.id,
      name: toolCall.name,
      content: formatToolError(error),
      isError: true,
    };
  }
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

function formatToolError(error: unknown): string {
  if (error instanceof ToolValidationError || error instanceof HarborError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Build a tool name lookup map.
 *
 * @param tools - Executable tools.
 */
export function indexTools(tools: readonly Tool[]): Map<string, Tool> {
  return new Map(tools.map((tool) => [tool.name, tool]));
}
