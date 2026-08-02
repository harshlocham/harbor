/**
 * @harbor/core — runtime-first AI agent SDK foundation.
 */

/** Package name constant. */
export const PACKAGE_NAME = "@harbor/core" as const;

export type { JsonObject, JsonPrimitive, JsonValue } from "./types/index.js";

export {
  HarborError,
  MaxIterationsExceededError,
  NotImplementedError,
  ToolValidationError,
} from "./errors/index.js";

export type { Message, MessageRole } from "./message/index.js";

export type { Tool, ToolCall, ToolDefinition, ToolResult } from "./tool/index.js";

export type {
  ModelProvider,
  ProviderFinishReason,
  ProviderRequest,
  ProviderResponse,
  ProviderToolCall,
  ProviderUsage,
} from "./provider/index.js";

export type { Session } from "./session/index.js";

export type {
  RunContext,
  RunOptions,
  RunResult,
  RunState,
  RunStatus,
  RunStreamEvent,
  RunTrace,
  RuntimeConfig,
  RuntimeEvent,
  TraceSpan,
} from "./runtime/index.js";
export { Runtime } from "./runtime/index.js";

export type { AgentConfig } from "./agent/index.js";
export { Agent } from "./agent/index.js";
