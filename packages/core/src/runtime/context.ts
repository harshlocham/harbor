import type { JsonObject } from "../types/json.js";

/**
 * Contextual information available while a run executes.
 */
export interface RunContext {
  /**
   * Unique run identifier.
   */
  runId: string;

  /**
   * Name of the agent executing the run.
   */
  agentName: string;

  /**
   * Optional session identifier.
   */
  sessionId?: string;

  /**
   * Abort signal for cooperative cancellation.
   */
  signal?: AbortSignal;

  /**
   * Arbitrary provider-agnostic metadata.
   */
  metadata?: JsonObject;
}
