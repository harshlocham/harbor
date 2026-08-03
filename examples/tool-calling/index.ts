import { Agent, Runtime, type JsonObject, type Tool } from "@harborts/core";
import { OpenAIProvider } from "@harborts/providers";

/**
 * Multi-tool agent: calculator + unit conversion in one run.
 */
const add: Tool = {
  name: "add",
  description: "Add two numbers.",
  parameters: {
    type: "object",
    properties: {
      a: { type: "number" },
      b: { type: "number" },
    },
    required: ["a", "b"],
  },
  execute(args: JsonObject) {
    return Number(args["a"]) + Number(args["b"]);
  },
};

const celsiusToFahrenheit: Tool = {
  name: "celsius_to_fahrenheit",
  description: "Convert a Celsius temperature to Fahrenheit.",
  parameters: {
    type: "object",
    properties: {
      celsius: { type: "number" },
    },
    required: ["celsius"],
  },
  execute(args: JsonObject) {
    return (Number(args["celsius"]) * 9) / 5 + 32;
  },
};

const agent = new Agent({
  name: "tools",
  provider: new OpenAIProvider({ model: "gpt-4o-mini" }),
  instructions:
    "You have math and conversion tools. Prefer calling tools over estimating. " +
    "Give a concise final answer that includes the computed values.",
  tools: [add, celsiusToFahrenheit],
  maxIterations: 6,
});

const runtime = new Runtime();

const result = await runtime.run({
  agent,
  input: "What is 19 + 23, and what is 19°C in Fahrenheit?",
  onEvent(event) {
    if (event.type === "tool.start") {
      console.log("calling:", event.toolCall.name, event.toolCall.arguments);
    }
    if (event.type === "tool.end") {
      console.log("result:", event.toolResult.name, "=", event.toolResult.content);
    }
  },
});

console.log("status:", result.status);
console.log("answer:", result.output?.content);
console.log("trace spans:", result.trace?.spans.length ?? 0);
