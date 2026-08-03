# Tool calling

Shows an agent with multiple tools (`add` and `celsius_to_fahrenheit`) and how Harbor executes tool calls inside `Runtime.run()`.

Docs: [Tools](../../docs/tools.mdx) · [Tracing](../../docs/tracing.mdx)

## What it demonstrates

- Registering more than one tool on an `Agent`
- Observing `tool.start` / `tool.end` via `onEvent`
- Reading the final answer and run trace from `RunResult`

## Setup

```sh
pnpm install
pnpm build
export OPENAI_API_KEY=sk-...
```

## Run

```sh
pnpm --filter @harborts/example-tool-calling start
```
