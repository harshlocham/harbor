import { HarborError } from "./harbor-error.js";

/**
 * Thrown when a public API surface is declared but not yet implemented.
 */
export class NotImplementedError extends HarborError {
  /**
   * @param feature - Name of the unimplemented feature (e.g. `"Runtime.run"`).
   */
  constructor(feature: string) {
    super(`${feature} is not implemented`, { code: "not_implemented" });
    this.name = "NotImplementedError";
  }
}
