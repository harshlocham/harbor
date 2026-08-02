import type { RunContext } from "../runtime/context.js";

import type { ProviderRequest, ProviderResponse } from "./types.js";

/**
 * Provider-agnostic interface for model generation.
 *
 * Implementations adapt vendor SDKs into Harbor request/response types.
 */
export interface ModelProvider {
  /**
   * Generate a model response for the given request.
   *
   * @param request - Provider-agnostic generation request.
   * @param context - Active run context.
   */
  generate(request: ProviderRequest, context: RunContext): Promise<ProviderResponse>;
}
