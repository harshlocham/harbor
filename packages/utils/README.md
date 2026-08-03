# `@harborts/utils`

Shared utilities for the Harbor AI agent SDK.

This package is a **stub** today. It exists so `@harborts/core` can depend on a stable workspace package while shared helpers land in later releases.

## Install

Usually pulled in transitively via `@harborts/core`:

```sh
pnpm add @harborts/core
```

Direct install (rarely needed):

```sh
pnpm add @harborts/utils
```

## Current API

```ts
import { PACKAGE_NAME } from "@harborts/utils";

console.log(PACKAGE_NAME); // "@harborts/utils"
```

## Status

Planned: shared helpers used across Harbor packages. See the [roadmap](../../docs/roadmap.mdx).

## Docs

- Monorepo docs: [../../docs](../../docs)
- Source: [github.com/harshlocham/harbor](https://github.com/harshlocham/harbor)

## License

[MIT](../../LICENSE)
