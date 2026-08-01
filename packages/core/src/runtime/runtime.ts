import type { Agent } from "../agent/agent.js";
import { NotImplementedError } from "../errors/not-implemented-error.js";

import type { RunOptions, RunResult, RunStreamEvent } from "./types.js";

/**
 * Harbor agent runtime skeleton.
 *
 * Execution methods are declared but not implemented yet.
 */
export class Runtime {
  readonly #agent: Agent;

  /**
   * @param agent - Agent this runtime will execute.
   */
  constructor(agent: Agent) {
    this.#agent = agent;
  }

  /**
   * Agent bound to this runtime.
   */
  get agent(): Agent {
    return this.#agent;
  }

  /**
   * Execute a run to completion.
   *
   * @param _options - Run input and options.
   * @returns Final run result.
   */
  async run(_options: RunOptions): Promise<RunResult> {
    throw new NotImplementedError("Runtime.run");
  }

  /**
   * Stream events for a run as it executes.
   *
   * @param _options - Run input and options.
   * @returns Async iterable of stream events.
   */
  stream(_options: RunOptions): AsyncIterable<RunStreamEvent> {
    return {
      [Symbol.asyncIterator]() {
        return {
          next() {
            return Promise.reject(new NotImplementedError("Runtime.stream"));
          },
        };
      },
    };
  }

  /**
   * Resume a previously paused or interrupted run.
   *
   * @param _runId - Identifier of the run to resume.
   * @param _options - Optional additional input for the resumed run.
   * @returns Final run result.
   */
  async resume(_runId: string, _options?: RunOptions): Promise<RunResult> {
    throw new NotImplementedError("Runtime.resume");
  }

  /**
   * Cancel an in-flight run.
   *
   * @param _runId - Identifier of the run to cancel.
   */
  async cancel(_runId: string): Promise<void> {
    throw new NotImplementedError("Runtime.cancel");
  }
}
