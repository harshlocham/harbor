# `@harborts/providers`

Model provider adapters for Harbor.

Includes the production `OpenAIProvider` (Chat Completions) and OpenAI message/tool mappers. Depends on `@harborts/core`; core never imports this package.

## Install

```sh
pnpm add @harborts/core @harborts/providers
```

```sh
export OPENAI_API_KEY=sk-...
```

## Quick example

```ts
import { Agent, Runtime } from "@harborts/core";
import { OpenAIProvider } from "@harborts/providers";

const provider = new OpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY, // or rely on env
  model: "gpt-4o-mini",
});

const result = await new Runtime().run({
  agent: new Agent({
    name: "assistant",
    provider,
    instructions: "Be concise.",
  }),
  input: "Say hello in five words.",
});

console.log(result.output?.content);
```

## Exports

| Export | Description |
| --- | --- |
| `OpenAIProvider` | Chat Completions `ModelProvider` |
| `OpenAIProviderOptions` | `apiKey`, `model`, `organization`, `baseURL`, optional `client` |
| `toOpenAIMessages` / `toOpenAIMessage` | Harbor → OpenAI message mapping |
| `fromOpenAIResponse` | OpenAI completion → Harbor assistant message |
| `toOpenAITools` | Harbor tool definitions → OpenAI tools |
| `toProviderError` / usage & finish-reason helpers | Error and response mapping |

Also available as `@harborts/providers/openai`.

## Limitations

- `OpenAIProvider.stream()` throws `NotImplementedError`
- SDK failures are wrapped in Harbor `ProviderError` (not leaked as raw OpenAI errors)

## Docs

- Providers guide: [../../docs/providers.mdx](../../docs/providers.mdx)
- Monorepo docs: [../../docs](../../docs)
- Source: [github.com/harshlocham/harbor](https://github.com/harshlocham/harbor)

## License

[MIT](../../LICENSE)
