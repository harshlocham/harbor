# Contributing to Harbor

Thanks for helping improve Harbor. This guide covers local development, quality checks, and releases.

## Prerequisites

- Node.js **20+**
- [pnpm](https://pnpm.io) **9.15+** (see `packageManager` in the root `package.json`)

## Development setup

```sh
git clone https://github.com/harshlocham/harbor.git
cd harbor
pnpm install
pnpm build
```

Workspace layout:

| Path                 | Package                   |
| -------------------- | ------------------------- |
| `packages/core`      | `@harbor/core`            |
| `packages/providers` | `@harbor/providers`       |
| `packages/utils`     | `@harbor/utils`           |
| `examples/*`         | Private runnable examples |

**Dependency rule:** `@harbor/providers` may depend on `@harbor/core`. `@harbor/core` must never depend on `@harbor/providers` or vendor SDKs.

## Build

```sh
pnpm build
```

Packages use [tsup](https://tsup.egoist.dev/) for dual ESM/CJS output under each package's `dist/`.

## Test

```sh
pnpm test
```

Vitest runs per package via Turbo. For core coverage:

```sh
pnpm --filter @harbor/core test:coverage
```

## Lint, typecheck, format

```sh
pnpm lint
pnpm typecheck
pnpm format        # write
pnpm format:check  # CI-style check
```

## Examples

Examples need a built workspace and (for OpenAI) an API key:

```sh
pnpm build
export OPENAI_API_KEY=sk-...
pnpm --filter @harbor/example-quickstart start
```

Typecheck examples:

```sh
pnpm --filter "./examples/*" typecheck
```

## Documentation

Docs are a [Mintlify](https://mintlify.com) site under [`docs/`](./docs) (`docs.json` + MDX). Keep snippets aligned with the **current** public API — do not invent methods or types. Prefer patterns already used in `examples/`.

```sh
pnpm docs:dev    # local preview (from docs/)
pnpm docs:check  # broken links + validate
```

## Pull requests

- Keep changes focused; do not modify runtime behavior unless the PR is explicitly about the runtime.
- Add or update Vitest coverage for behavioral changes.
- Preserve provider isolation (no OpenAI types in `@harbor/core`).
- Run `pnpm build`, `pnpm test`, and `pnpm lint` before opening a PR.
- Update docs/examples when you change public surface area.

## Release process

Harbor uses [Changesets](https://github.com/changesets/changesets).

1. For user-facing package changes, add a changeset:

   ```sh
   pnpm changeset
   ```

2. Merge to `main`. The [release workflow](./.github/workflows/release.yml) either opens a version PR or publishes.

3. Locally (maintainers):

   ```sh
   pnpm version-packages   # apply changesets
   pnpm release            # build + changeset publish
   ```

Publishing requires `NPM_TOKEN` (and OIDC/`id-token` permissions as configured in Actions). Packages are published with `"access": "public"` under the `@harbor` scope.

## Questions

Open a GitHub issue: https://github.com/harshlocham/harbor/issues
