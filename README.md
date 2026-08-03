# Harbor

Harbor is a runtime-first AI Agent SDK for TypeScript.

## Quickstart

```ts
import { Agent, Runtime, type Tool } from "@harbor/core";
import { OpenAIProvider } from "@harbor/providers";

const getTime: Tool = {
  name: "get_time",
  description: "Return the current UTC time as an ISO-8601 string.",
  parameters: { type: "object", properties: {} },
  execute() {
    return new Date().toISOString();
  },
};

const agent = new Agent({
  name: "quickstart",
  provider: new OpenAIProvider({ model: "gpt-4o-mini" }),
  instructions: "When asked for the time, call get_time and answer briefly.",
  tools: [getTime],
});

const result = await new Runtime().run({
  agent,
  input: "What time is it in UTC right now?",
});

console.log(result.output?.content);
```

Requires Node.js 20+, pnpm 9.15+, and `OPENAI_API_KEY`:

```sh
pnpm install
pnpm build
export OPENAI_API_KEY=sk-...
pnpm --filter @harbor/example-quickstart start
```

Full source: [`examples/quickstart`](./examples/quickstart).

## Examples

| Example | Demonstrates |
| --- | --- |
| [`examples/quickstart`](./examples/quickstart) | Agent + tool + `Runtime.run()` |
| [`examples/weather`](./examples/weather) | Tool loop with a weather lookup |
| [`examples/tool-calling`](./examples/tool-calling) | Multiple tools and run events |
| [`examples/multi-agent`](./examples/multi-agent) | Agents composing via nested runs |

## Requirements

- Node.js 20+
- [pnpm](https://pnpm.io) 9.15+

## Packages

| Package | Description |
| --- | --- |
| `@harbor/core` | Agent runtime and provider-agnostic types |
| `@harbor/providers` | Provider adapters (OpenAI) and message mappers |
| `@harbor/utils` | Shared utilities |

## Scripts

```sh
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm typecheck
pnpm format
pnpm format:check
```

Versioning uses [Changesets](https://github.com/changesets/changesets):

```sh
pnpm changeset
pnpm version-packages
pnpm release
```

## Development

Library packages use TypeScript project references, [tsup](https://tsup.egoist.dev/) for dual ESM/CJS builds, [Vitest](https://vitest.dev/) for tests, ESLint + Prettier for code quality, and [Turbo](https://turbo.build/) for task orchestration.

## License

[MIT](./LICENSE)
