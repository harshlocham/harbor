/**
 * @harborts/core — runtime-first AI agent SDK foundation.
 */

/** Package name constant. */
export const PACKAGE_NAME = "@harborts/core" as const;

export type { JsonObject, JsonPrimitive, JsonValue } from "./types/index.js";

export {
  HarborError,
  MaxIterationsExceededError,
  NotImplementedError,
  ProviderError,
  ToolError,
  ToolValidationError,
} from "./errors/index.js";
export type { ProviderErrorCode, ToolErrorCode } from "./errors/index.js";

export type { Message, MessageRole } from "./message/index.js";

export type { Tool, ToolCall, ToolDefinition, ToolResult } from "./tool/index.js";
export { ToolExecutor } from "./tool/index.js";

export type {
  ModelInfo,
  ModelProvider,
  MockProviderOptions,
  MockProviderResponse,
  ProviderCapabilities,
  ProviderFinishReason,
  ProviderRequest,
  ProviderResponse,
  ProviderResponseFormat,
  ProviderStreamEvent,
  ProviderToolCall,
  ProviderUsage,
} from "./provider/index.js";
export { MockProvider } from "./provider/index.js";

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
