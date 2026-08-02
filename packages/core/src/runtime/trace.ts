import type { JsonObject } from "../types/json.js";

/**
 * A single timed span recorded during a run.
 */
export interface TraceSpan {
  /**
   * Span name (e.g. `"provider.generate"`, `"tool.execute"`).
   */
  name: string;

  /**
   * Unix epoch milliseconds when the span started.
   */
  startTime: number;

  /**
   * Unix epoch milliseconds when the span ended.
   */
  endTime?: number;

  /**
   * Arbitrary span attributes.
   */
  attributes?: JsonObject;

  /**
   * Span completion status.
   */
  status?: "ok" | "error";

  /**
   * Error message when `status` is `"error"`.
   */
  error?: string;
}

/**
 * Trace information collected for a run.
 */
export interface RunTrace {
  /**
   * Run this trace belongs to.
   */
  runId: string;

  /**
   * Ordered spans recorded during the run.
   */
  spans: TraceSpan[];
}

/**
 * Mutable helper for recording run traces.
 */
export class TraceRecorder {
  readonly #runId: string;
  readonly #spans: TraceSpan[] = [];

  /**
   * @param runId - Run identifier for the trace.
   */
  constructor(runId: string) {
    this.#runId = runId;
  }

  /**
   * Start a span and return a handle used to end it.
   *
   * @param name - Span name.
   * @param attributes - Optional initial attributes.
   */
  startSpan(name: string, attributes?: JsonObject): { end: (error?: unknown) => void } {
    const span: TraceSpan = {
      name,
      startTime: Date.now(),
    };
    if (attributes !== undefined) {
      span.attributes = attributes;
    }
    this.#spans.push(span);

    return {
      end: (error?: unknown) => {
        span.endTime = Date.now();
        if (error === undefined) {
          span.status = "ok";
          return;
        }
        span.status = "error";
        span.error = error instanceof Error ? error.message : String(error);
      },
    };
  }

  /**
   * Immutable snapshot of the recorded trace.
   */
  snapshot(): RunTrace {
    return {
      runId: this.#runId,
      spans: this.#spans.map((span) => ({ ...span })),
    };
  }
}
