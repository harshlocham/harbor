# Multi-agent

Composes multiple Harbor agents: a coordinator delegates to researcher and writer specialists through tools that each call `Runtime.run()`.

Docs: [Agents](../../docs/agents.mdx) · [Examples overview](../../docs/examples/overview.mdx)

## What it demonstrates

- Multiple `Agent` instances sharing one `OpenAIProvider` and `Runtime`
- Tool-based handoff between agents (no special multi-agent runtime required)
- Nested `Runtime.run()` calls from tool `execute` handlers
- Handling the coordinator's final `RunResult`

## Setup

```sh
pnpm install
pnpm build
export OPENAI_API_KEY=sk-...
```

## Run

```sh
pnpm --filter @harborts/example-multi-agent start
```

Optional topic argument:

```sh
pnpm --filter @harborts/example-multi-agent start -- "edge caching for APIs"
```
