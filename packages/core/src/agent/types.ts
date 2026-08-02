import type { ModelProvider } from "../provider/model-provider.js";
import type { Tool } from "../tool/types.js";
import type { JsonObject } from "../types/json.js";

/**
 * Static configuration for a Harbor agent.
 */
export interface AgentConfig {
  /**
   * Human-readable agent name.
   */
  name: string;

  /**
   * Model provider used for generation.
   */
  provider: ModelProvider;

  /**
   * System-level instructions for the agent.
   */
  instructions?: string;

  /**
   * Executable tools the agent may invoke.
   */
  tools?: Tool[];

  /**
   * Default model identifier for provider requests.
   */
  model?: string;

  /**
   * Default maximum model/tool loop iterations for runs of this agent.
   */
  maxIterations?: number;

  /**
   * Arbitrary provider-agnostic metadata.
   */
  metadata?: JsonObject;
}
