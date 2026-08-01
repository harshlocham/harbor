/**
 * @harbor/core — runtime-first AI agent SDK foundation.
 */

/** Package name constant. */
export const PACKAGE_NAME = "@harbor/core" as const;

export type { JsonObject, JsonPrimitive, JsonValue } from "./types/index.js";

export { HarborError, NotImplementedError } from "./errors/index.js";

export type { Message, MessageRole } from "./message/index.js";

export type { ToolCall, ToolDefinition, ToolResult } from "./tool/index.js";

export type {
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
} from "./runtime/index.js";
export { Runtime } from "./runtime/index.js";

export type { AgentConfig } from "./agent/index.js";
export { Agent } from "./agent/index.js";
