import { HarborError } from "./harbor-error.js";

/**
 * Stable error codes for provider failures.
 */
export type ProviderErrorCode =
  | "provider_error"
  | "provider_unavailable"
  | "provider_timeout"
  | "provider_rate_limited"
  | "provider_invalid_request"
  | "provider_authentication"
  | "provider_not_supported"
  | "provider_cancelled";

/**
 * Error thrown by a {@link ModelProvider} implementation.
 *
 * Completely vendor-agnostic — never wraps OpenAI/Anthropic SDK types.
 */
export class ProviderError extends HarborError {
  /**
   * Provider identifier that produced the error, when known.
   */
  readonly provider?: string;

  /**
   * Optional HTTP-like status code from the underlying transport.
   */
  readonly statusCode?: number;

  /**
   * Whether the caller may reasonably retry the request.
   */
  readonly retryable: boolean;

  /**
   * @param message - Human-readable failure description.
   * @param options - Provider error details.
   */
  constructor(
    message: string,
    options: {
      code?: ProviderErrorCode;
      provider?: string;
      statusCode?: number;
      retryable?: boolean;
      cause?: unknown;
    } = {},
  ) {
    super(message, {
      code: options.code ?? "provider_error",
      ...(options.cause !== undefined ? { cause: options.cause } : {}),
    });
    this.name = "ProviderError";
    this.retryable = options.retryable ?? false;
    if (options.provider !== undefined) {
      this.provider = options.provider;
    }
    if (options.statusCode !== undefined) {
      this.statusCode = options.statusCode;
    }
  }
}
