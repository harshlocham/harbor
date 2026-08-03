# `@harborts/core`

Runtime-first AI agent SDK for TypeScript.

This package provides Harbor's provider-agnostic primitives: `Agent`, `Runtime`, tools, messages, `ModelProvider`, tracing types, and errors.

## Install

```sh
pnpm add @harborts/core
# pair with a provider for real runs:
pnpm add @harborts/providers
```

## Quick example

```ts
import { Agent, Runtime, type Tool } from "@harborts/core";
import { OpenAIProvider } from "@harborts/providers";

const ping: Tool = {
  name: "ping",
  description: "Return pong",
  parameters: { type: "object", properties: {} },
  execute: () => "pong",
};

const result = await new Runtime().run({
  agent: new Agent({
    name: "demo",
    provider: new OpenAIProvider({ model: "gpt-4o-mini" }),
    instructions: "Be brief. Use tools when needed.",
    tools: [ping],
  }),
  input: "Call ping and reply with the result.",
});

console.log(result.output?.content);
```

## What's included

| Export | Description |
| --- | --- |
| `Agent` / `AgentConfig` | Agent configuration (instructions, tools, provider) |
| `Runtime` | Iterative `run()` loop |
| `Tool` / `ToolExecutor` | Tool definitions and execution |
| `ModelProvider` / `MockProvider` | Provider interface + in-memory mock |
| `Message` | Conversation message types |
| `RunResult` / `RuntimeEvent` / `RunTrace` | Run outcomes, events, and spans |
| `HarborError` and subclasses | Typed SDK errors |

## Limitations

- `Runtime.stream`, `resume`, and `cancel` throw `NotImplementedError`
- `Session` is a type only (no persistence API)
- Vendor SDKs belong in `@harborts/providers`, not this package

## Docs

- Monorepo docs: [../../docs](../../docs)
- Examples: [../../examples](../../examples)
- Source: [github.com/harshlocham/harbor](https://github.com/harshlocham/harbor)

## License

[MIT](../../LICENSE)
