/**
 * JSON primitive values supported throughout Harbor.
 */
export type JsonPrimitive = string | number | boolean | null;

/**
 * Any JSON-compatible value.
 */
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

/**
 * A JSON object with string keys.
 */
export type JsonObject = { [key: string]: JsonValue };
