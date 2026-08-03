import { Agent, Runtime, type Tool } from "@harbor/core";
import { OpenAIProvider } from "@harbor/providers";

/**
 * Quickstart: create an agent, register a tool, run it, print the result.
 *
 * Requires OPENAI_API_KEY in the environment.
 */
const getTime: Tool = {
  name: "get_time",
  description: "Return the current UTC time as an ISO-8601 string.",
  parameters: {
    type: "object",
    properties: {},
  },
  execute() {
    return new Date().toISOString();
  },
};

const provider = new OpenAIProvider({ model: "gpt-4o-mini" });

const agent = new Agent({
  name: "quickstart",
  provider,
  instructions:
    "You are a helpful assistant. When asked for the time, call get_time and answer briefly.",
  tools: [getTime],
});

const runtime = new Runtime();

const result = await runtime.run({
  agent,
  input: "What time is it in UTC right now?",
});

console.log("status:", result.status);
console.log("output:", result.output?.content);
console.log("messages:", result.messages.length);
