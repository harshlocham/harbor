# Harbor examples

Runnable samples for the Harbor Agent SDK. Each package is under 100 lines of TypeScript and uses only the public `@harborts/core` / `@harborts/providers` APIs.

Guides: [`docs/examples/overview.mdx`](../docs/examples/overview.mdx) · [`docs/getting-started.mdx`](../docs/getting-started.mdx) · preview with `pnpm docs:dev`

| Example                        | Command                                            |
| ------------------------------ | -------------------------------------------------- |
| [quickstart](./quickstart)     | `pnpm --filter @harborts/example-quickstart start`   |
| [weather](./weather)           | `pnpm --filter @harborts/example-weather start`      |
| [tool-calling](./tool-calling) | `pnpm --filter @harborts/example-tool-calling start` |
| [multi-agent](./multi-agent)   | `pnpm --filter @harborts/example-multi-agent start`  |

```sh
pnpm install
pnpm build
export OPENAI_API_KEY=sk-...
```
