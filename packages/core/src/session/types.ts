import type { Message } from "../message/types.js";
import type { JsonObject } from "../types/json.js";

/**
 * A durable conversation session holding ordered messages.
 */
export interface Session {
  /**
   * Unique session identifier.
   */
  id: string;

  /**
   * Ordered transcript for this session.
   */
  messages: Message[];

  /**
   * Arbitrary provider-agnostic metadata.
   */
  metadata?: JsonObject;

  /**
   * Unix epoch milliseconds when the session was created.
   */
  createdAt: number;

  /**
   * Unix epoch milliseconds when the session was last updated.
   */
  updatedAt: number;
}
