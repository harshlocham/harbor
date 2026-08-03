import type {
  ModelInfo,
  ProviderCapabilities,
  ProviderRequest,
  ProviderResponse,
  ProviderStreamEvent,
} from "./types.js";

/**
 * Provider-agnostic interface for model generation and streaming.
 *
 * Implementations adapt vendor SDKs into Harbor request/response types.
 * This interface must never reference OpenAI, Anthropic, or other vendor SDK types.
 */
export interface ModelProvider {
  /**
   * Stable provider identifier (e.g. `"mock"`, `"openai"`, `"anthropic"`).
   */
  readonly id: string;

  /**
   * Declared feature support for this provider implementation.
   */
  readonly capabilities: ProviderCapabilities;

  /**
   * Generate a complete model response for the given request.
   *
   * @param request - Provider-agnostic generation request.
   */
  generate(request: ProviderRequest): Promise<ProviderResponse>;

  /**
   * Stream model output for the given request.
   *
   * Providers that do not support streaming should throw {@link ProviderError}
   * with code `"provider_not_supported"`.
   *
   * @param request - Provider-agnostic generation request.
   */
  stream(request: ProviderRequest): AsyncIterable<ProviderStreamEvent>;

  /**
   * Return metadata for a model id, when the provider can resolve it.
   *
   * @param modelId - Provider-specific model identifier.
   */
  getModelInfo?(modelId: string): Promise<ModelInfo> | ModelInfo;
}
