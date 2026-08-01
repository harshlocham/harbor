import type { AgentConfig } from "./types.js";

/**
 * Configured Harbor agent identity.
 *
 * Holds configuration only; execution is performed by {@link Runtime}.
 */
export class Agent {
  readonly #config: Readonly<AgentConfig>;

  /**
   * @param config - Agent configuration.
   */
  constructor(config: AgentConfig) {
    this.#config = Object.freeze({ ...config });
  }

  /**
   * Immutable agent configuration.
   */
  get config(): Readonly<AgentConfig> {
    return this.#config;
  }

  /**
   * Agent display name from configuration.
   */
  get name(): string {
    return this.#config.name;
  }
}
