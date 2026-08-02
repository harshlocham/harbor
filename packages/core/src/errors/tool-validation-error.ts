import { HarborError } from "./harbor-error.js";

/**
 * Thrown when tool call arguments fail validation before execution.
 */
export class ToolValidationError extends HarborError {
  /**
   * Name of the tool that failed validation.
   */
  readonly toolName: string;

  /**
   * @param toolName - Tool that failed validation.
   * @param message - Human-readable validation failure.
   */
  constructor(toolName: string, message: string) {
    super(message, { code: "tool_validation_error" });
    this.name = "ToolValidationError";
    this.toolName = toolName;
  }
}
