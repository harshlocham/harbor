# Quickstart

The smallest end-to-end Harbor example: an `Agent` with `OpenAIProvider`, one tool, `Runtime.run()`, and printing the result.

## What it demonstrates

- Constructing `OpenAIProvider` (reads `OPENAI_API_KEY`)
- Registering a tool on an `Agent`
- Running the agent loop with `Runtime.run()`
- Reading `RunResult.status` and `RunResult.output`

## Setup

From the repository root:

```sh
pnpm install
pnpm build
export OPENAI_API_KEY=sk-...
```

## Run

```sh
pnpm --filter @harbor/example-quickstart start
```

Or from this directory:

```sh
pnpm start
```
