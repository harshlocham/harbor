import { Agent, Runtime, type JsonObject, type Tool } from "@harborts/core";
import { OpenAIProvider } from "@harborts/providers";

/**
 * Weather agent that must call get_weather before answering.
 *
 * Uses a deterministic mock forecast so the example needs no weather API.
 */
const FORECASTS: Record<string, { tempC: number; conditions: string }> = {
  seattle: { tempC: 14, conditions: "light rain" },
  tokyo: { tempC: 22, conditions: "clear" },
  london: { tempC: 11, conditions: "overcast" },
};

const getWeather: Tool = {
  name: "get_weather",
  description: "Look up the current weather for a city.",
  parameters: {
    type: "object",
    properties: {
      city: { type: "string", description: "City name, e.g. Seattle" },
    },
    required: ["city"],
  },
  execute(args: JsonObject) {
    const city = String(args["city"] ?? "")
      .trim()
      .toLowerCase();
    const forecast = FORECASTS[city] ?? { tempC: 18, conditions: "partly cloudy" };
    return { city, ...forecast, unit: "C" };
  },
};

const agent = new Agent({
  name: "weather",
  provider: new OpenAIProvider({ model: "gpt-4o-mini" }),
  instructions:
    "You are a weather assistant. Always call get_weather before answering. " +
    "Reply in one short sentence with temperature and conditions.",
  tools: [getWeather],
  maxIterations: 5,
});

const city = process.argv[2] ?? "Seattle";
const runtime = new Runtime();

const result = await runtime.run({
  agent,
  input: `What is the weather in ${city}?`,
  onEvent(event) {
    if (event.type === "tool.end") {
      console.log("tool:", event.toolResult.name, "→", event.toolResult.content);
    }
  },
});

console.log("status:", result.status);
console.log("answer:", result.output?.content);
