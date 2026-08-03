import { Agent, Runtime, type JsonObject, type Tool } from "@harbor/core";
import { OpenAIProvider } from "@harbor/providers";

/**
 * Two specialists + a coordinator.
 *
 * The coordinator calls `ask_researcher` / `ask_writer`, each of which runs
 * another Agent through the same Runtime — composition via the public API.
 */
const provider = new OpenAIProvider({ model: "gpt-4o-mini" });
const runtime = new Runtime();

const researcher = new Agent({
  name: "researcher",
  provider,
  instructions: "You research briefly. Return 2-3 factual bullet points, no fluff.",
});

const writer = new Agent({
  name: "writer",
  provider,
  instructions: "You turn research notes into one polished paragraph for a general audience.",
});

const askResearcher: Tool = {
  name: "ask_researcher",
  description: "Ask the researcher agent for short notes on a topic.",
  parameters: {
    type: "object",
    properties: { topic: { type: "string" } },
    required: ["topic"],
  },
  async execute(args: JsonObject) {
    const result = await runtime.run({
      agent: researcher,
      input: String(args["topic"]),
    });
    return result.output?.content ?? "";
  },
};

const askWriter: Tool = {
  name: "ask_writer",
  description: "Ask the writer agent to turn research notes into a paragraph.",
  parameters: {
    type: "object",
    properties: { notes: { type: "string" } },
    required: ["notes"],
  },
  async execute(args: JsonObject) {
    const result = await runtime.run({
      agent: writer,
      input: String(args["notes"]),
    });
    return result.output?.content ?? "";
  },
};

const coordinator = new Agent({
  name: "coordinator",
  provider,
  instructions:
    "Coordinate specialists. First call ask_researcher, then ask_writer with those notes. " +
    "Return only the writer's paragraph.",
  tools: [askResearcher, askWriter],
  maxIterations: 8,
});

const topic = process.argv[2] ?? "why TypeScript prefers structural typing";

const result = await runtime.run({
  agent: coordinator,
  input: `Produce a short explainer about: ${topic}`,
  onEvent(event) {
    if (event.type === "tool.end") {
      console.log(`[${event.toolResult.name}]`, event.toolResult.content.slice(0, 120) + "…");
    }
  },
});

console.log("status:", result.status);
console.log("\n" + (result.output?.content ?? "(no output)"));
