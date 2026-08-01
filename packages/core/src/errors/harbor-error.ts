/**
 * Base error type for all Harbor SDK failures.
 */
export class HarborError extends Error {
  /**
   * Stable machine-readable error code.
   */
  readonly code: string;

  /**
   * Optional underlying cause.
   */
  override readonly cause?: unknown;

  /**
   * @param message - Human-readable description of the failure.
   * @param options - Error options including code and optional cause.
   */
  constructor(
    message: string,
    options: {
      code: string;
      cause?: unknown;
    },
  ) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "HarborError";
    this.code = options.code;
    if (options.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}
