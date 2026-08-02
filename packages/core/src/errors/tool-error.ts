import { HarborError } from "./harbor-error.js";

/**
 * Stable error codes produced by {@link ToolExecutor}.
 */
export type ToolErrorCode = "unknown_tool" | "validation_error" | "execution_error";

/**
 * Structured failure from tool lookup, validation, or execution.
 *
 * Returned on `ToolResult.error`; never thrown to the runtime loop.
 */
export class ToolError extends HarborError {
  /**
   * Name of the tool involved in the failure.
   */
  readonly toolName: string;

  /**
   * Tool call identifier, when available.
   */
  readonly toolCallId?: string;

  /**
   * @param toolName - Tool involved in the failure.
   * @param message - Human-readable failure description.
   * @param options - Error code, optional tool call id, and optional cause.
   */
  constructor(
    toolName: string,
    message: string,
    options: {
      code: ToolErrorCode;
      toolCallId?: string;
      cause?: unknown;
    },
  ) {
    super(message, {
      code: options.code,
      ...(options.cause !== undefined ? { cause: options.cause } : {}),
    });
    this.name = "ToolError";
    this.toolName = toolName;
    if (options.toolCallId !== undefined) {
      this.toolCallId = options.toolCallId;
    }
  }
}
