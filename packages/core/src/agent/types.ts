import type { ToolDefinition } from "../tool/types.js";
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
   * System-level instructions for the agent.
   */
  instructions?: string;

  /**
   * Tools the agent may invoke.
   */
  tools?: ToolDefinition[];

  /**
   * Default model identifier for provider requests.
   */
  model?: string;

  /**
   * Arbitrary provider-agnostic metadata.
   */
  metadata?: JsonObject;
}
