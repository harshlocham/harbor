import type { JsonObject } from "../types/json.js";

/**
 * A request from the model to invoke a named tool.
 */
export interface ToolCall {
  /**
   * Unique identifier for this tool call within a run.
   */
  id: string;

  /**
   * Tool name to invoke.
   */
  name: string;

  /**
   * Parsed JSON arguments for the tool.
   */
  arguments: JsonObject;
}

/**
 * Result produced by executing a tool call.
 */
export interface ToolResult {
  /**
   * Identifier of the tool call this result answers.
   */
  toolCallId: string;

  /**
   * Tool name that was executed.
   */
  name: string;

  /**
   * Serialized result content returned to the model.
   */
  content: string;

  /**
   * Whether execution failed.
   */
  isError?: boolean;
}

/**
 * Provider-agnostic description of a tool the agent may call.
 *
 * `parameters` is a JSON-Schema-like object describing the argument shape.
 */
export interface ToolDefinition {
  /**
   * Unique tool name.
   */
  name: string;

  /**
   * Human-readable description of what the tool does.
   */
  description: string;

  /**
   * JSON-Schema-like parameter definition.
   */
  parameters: JsonObject;
}
