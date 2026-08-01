# Harbor

Harbor is a runtime-first AI Agent SDK for TypeScript.

This repository is a pnpm + Turbo monorepo. Packages are infrastructure stubs today — runtime logic will land in subsequent work.

## Requirements

- Node.js 20+
- [pnpm](https://pnpm.io) 9.15+

## Packages

| Package             | Description                   |
| ------------------- | ----------------------------- |
| `@harbor/core`      | Agent runtime (stub)          |
| `@harbor/providers` | Model / tool providers (stub) |
| `@harbor/utils`     | Shared utilities (stub)       |

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
