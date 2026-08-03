# Weather

A weather agent that must call a `get_weather` tool before answering. The forecast is mocked so you only need an OpenAI API key.

Docs: [Tools](../../docs/tools.mdx) · [Runtime](../../docs/runtime.mdx)

## What it demonstrates

- Tool registration with JSON-Schema-like parameters
- The model/tool loop inside `Runtime.run()`
- Optional `onEvent` listening for `tool.end`
- Handling `RunResult.output`

## Setup

```sh
pnpm install
pnpm build
export OPENAI_API_KEY=sk-...
```

## Run

```sh
pnpm --filter @harbor/example-weather start
```

Pass a city as an argument (defaults to Seattle):

```sh
pnpm --filter @harbor/example-weather start -- Tokyo
```
