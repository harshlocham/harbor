import { ToolValidationError } from "../errors/tool-validation-error.js";
import type { JsonObject, JsonValue } from "../types/json.js";

import type { ToolDefinition } from "./types.js";

/**
 * Validate tool call arguments against a JSON-Schema-like parameter definition.
 *
 * Supports `required` and simple `properties` type checks (`string`, `number`,
 * `boolean`, `object`, `array`, `null`).
 *
 * @param tool - Tool definition used for validation.
 * @param args - Arguments supplied by the model.
 */
export function validateToolArguments(tool: ToolDefinition, args: JsonObject): void {
  const required = tool.parameters["required"];
  if (Array.isArray(required)) {
    for (const key of required) {
      if (typeof key !== "string") {
        continue;
      }
      if (!(key in args)) {
        throw new ToolValidationError(
          tool.name,
          `Missing required argument "${key}" for tool "${tool.name}"`,
        );
      }
    }
  }

  const properties = tool.parameters["properties"];
  if (properties === null || typeof properties !== "object" || Array.isArray(properties)) {
    return;
  }

  for (const [key, schema] of Object.entries(properties)) {
    if (!(key in args)) {
      continue;
    }
    if (schema === null || typeof schema !== "object" || Array.isArray(schema)) {
      continue;
    }
    const expectedType = schema["type"];
    if (typeof expectedType !== "string") {
      continue;
    }
    const value = args[key];
    if (!matchesJsonSchemaType(value, expectedType)) {
      throw new ToolValidationError(
        tool.name,
        `Argument "${key}" for tool "${tool.name}" expected type "${expectedType}"`,
      );
    }
  }
}

function matchesJsonSchemaType(value: JsonValue | undefined, expectedType: string): boolean {
  switch (expectedType) {
    case "string":
      return typeof value === "string";
    case "number":
    case "integer":
      return typeof value === "number" && (expectedType === "number" || Number.isInteger(value));
    case "boolean":
      return typeof value === "boolean";
    case "object":
      return value !== null && typeof value === "object" && !Array.isArray(value);
    case "array":
      return Array.isArray(value);
    case "null":
      return value === null;
    default:
      return true;
  }
}
