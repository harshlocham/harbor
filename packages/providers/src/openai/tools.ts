import type { ToolDefinition } from "@harbor/core";

/**
 * OpenAI Chat Completions tool definition (function calling).
 */
export interface OpenAIChatToolDefinition {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

/**
 * Convert Harbor tool definitions into OpenAI function tool definitions.
 *
 * @param tools - Harbor tool definitions.
 */
export function toOpenAITools(
  tools: readonly ToolDefinition[],
): OpenAIChatToolDefinition[] {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}
