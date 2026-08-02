import type { HarborError } from "../errors/harbor-error.js";
import type { Message } from "../message/types.js";
import type { ProviderRequest, ProviderResponse } from "../provider/types.js";
import type { ToolCall, ToolResult } from "../tool/types.js";

import type { RunContext } from "./context.js";
import type { RunResult } from "./types.js";

/**
 * Events emitted by the runtime during `run()` execution.
 */
export type RuntimeEvent =
  | {
      /** A run has started. */
      type: "run.start";
      context: RunContext;
    }
  | {
      /** A run has finished. */
      type: "run.end";
      result: RunResult;
    }
  | {
      /** A model/tool loop iteration is starting. */
      type: "iteration.start";
      iteration: number;
    }
  | {
      /** A model/tool loop iteration has finished. */
      type: "iteration.end";
      iteration: number;
    }
  | {
      /** A provider request is about to be sent. */
      type: "provider.request";
      request: ProviderRequest;
    }
  | {
      /** A provider response was received. */
      type: "provider.response";
      response: ProviderResponse;
    }
  | {
      /** A message was appended to the conversation. */
      type: "message";
      message: Message;
    }
  | {
      /** Tool execution is starting. */
      type: "tool.start";
      toolCall: ToolCall;
    }
  | {
      /** Tool execution finished. */
      type: "tool.end";
      toolResult: ToolResult;
    }
  | {
      /** A non-fatal or terminal error occurred during the run. */
      type: "error";
      error: HarborError;
    };
