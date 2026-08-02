import { HarborError } from "./harbor-error.js";

/**
 * Thrown when a run exceeds its configured maximum model/tool iterations.
 */
export class MaxIterationsExceededError extends HarborError {
  /**
   * Configured iteration limit that was exceeded.
   */
  readonly maxIterations: number;

  /**
   * @param maxIterations - Maximum iterations allowed for the run.
   */
  constructor(maxIterations: number) {
    super(`Exceeded max iterations (${String(maxIterations)})`, {
      code: "max_iterations_exceeded",
    });
    this.name = "MaxIterationsExceededError";
    this.maxIterations = maxIterations;
  }
}
