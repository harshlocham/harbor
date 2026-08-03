# Harbor examples

Runnable samples for the Harbor Agent SDK. Each package is under 100 lines of TypeScript and uses only the public `@harbor/core` / `@harbor/providers` APIs.

Guides: [`docs/examples/overview.mdx`](../docs/examples/overview.mdx) · [`docs/getting-started.mdx`](../docs/getting-started.mdx) · preview with `pnpm docs:dev`

| Example                        | Command                                            |
| ------------------------------ | -------------------------------------------------- |
| [quickstart](./quickstart)     | `pnpm --filter @harbor/example-quickstart start`   |
| [weather](./weather)           | `pnpm --filter @harbor/example-weather start`      |
| [tool-calling](./tool-calling) | `pnpm --filter @harbor/example-tool-calling start` |
| [multi-agent](./multi-agent)   | `pnpm --filter @harbor/example-multi-agent start`  |

```sh
pnpm install
pnpm build
export OPENAI_API_KEY=sk-...
```
