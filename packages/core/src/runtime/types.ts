import type { HarborError } from "../errors/harbor-error.js";
import type { Message } from "../message/types.js";
import type { Session } from "../session/types.js";
import type { ToolCall, ToolResult } from "../tool/types.js";
import type { JsonObject } from "../types/json.js";

/**
 * Lifecycle status of a Harbor run.
 *
 * - `"pending"`: created but not started
 * - `"running"`: actively executing
 * - `"completed"`: finished successfully
 * - `"failed"`: finished with an error
 * - `"cancelled"`: aborted by the caller
 * - `"paused"`: waiting to be resumed (e.g. after a tool boundary)
 */
export type RunStatus = "pending" | "running" | "completed" | "failed" | "cancelled" | "paused";

/**
 * Snapshot of a run's durable state.
 */
export interface RunState {
  /**
   * Unique run identifier.
   */
  runId: string;

  /**
   * Current lifecycle status.
   */
  status: RunStatus;

  /**
   * Messages accumulated for this run.
   */
  messages: Message[];

  /**
   * Optional session this run belongs to.
   */
  sessionId?: string;

  /**
   * Unix epoch milliseconds when the run was created.
   */
  createdAt: number;

  /**
   * Unix epoch milliseconds when the run was last updated.
   */
  updatedAt: number;

  /**
   * Arbitrary provider-agnostic metadata.
   */
  metadata?: JsonObject;
}

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

/**
 * Options for starting or resuming a run.
 */
export interface RunOptions {
  /**
   * User input as plain text, a single message, or a message list.
   */
  input: string | Message | Message[];

  /**
   * Optional session to continue.
   */
  session?: Session;

  /**
   * Abort signal for cooperative cancellation.
   */
  signal?: AbortSignal;

  /**
   * Arbitrary provider-agnostic metadata.
   */
  metadata?: JsonObject;
}

/**
 * Final outcome of a Harbor run.
 */
export interface RunResult {
  /**
   * Unique run identifier.
   */
  runId: string;

  /**
   * Terminal or current status of the run.
   */
  status: RunStatus;

  /**
   * Full message transcript for the run.
   */
  messages: Message[];

  /**
   * Primary assistant output message, when available.
   */
  output?: Message;

  /**
   * Error that caused the run to fail, when applicable.
   */
  error?: HarborError;
}

/**
 * Events emitted while streaming a run.
 */
export type RunStreamEvent =
  /**
   * Run status changed.
   */
  | { type: "status"; status: RunStatus }
  /**
   * Incremental assistant text delta.
   */
  | { type: "message.delta"; delta: string }
  /**
   * A complete message was produced.
   */
  | { type: "message"; message: Message }
  /**
   * The model requested a tool call.
   */
  | { type: "tool_call"; toolCall: ToolCall }
  /**
   * A tool finished and produced a result.
   */
  | { type: "tool_result"; toolResult: ToolResult }
  /**
   * An error occurred during the run.
   */
  | { type: "error"; error: HarborError }
  /**
   * The run finished; carries the final result.
   */
  | { type: "done"; result: RunResult };
