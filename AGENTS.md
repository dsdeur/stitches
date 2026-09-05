# Agent instructions for this repository

This is a maintained fork of stitches (CSS-in-JS). It is consumed by several large
production codebases, so API compatibility matters more than elegance. Read
`docs/typescript-rewrite-and-roadmap.md` before starting any task; it is the source of
truth for status, decisions, and the task queue (section 8).

## Branches and remotes

- `next` is the default branch and the base for every PR. Never commit to `canary`; it is
  the frozen upstream state we compare against.
- Push only to `origin` (dsdeur/stitches). Never push, open PRs, or comment on
  `upstream` (stitchesjs/stitches).
- One task, one branch, one PR. Keep PRs small enough to review in one sitting.

## Setup and commands

Node 22 (see `.nvmrc`), Yarn 1 (`yarn.lock` v1). No global installs are needed.

```bash
yarn install --frozen-lockfile
yarn typecheck   # tsc -p tsconfig.json (strict); the only real typecheck, lint:tsc is a no-op
yarn test        # vitest over packages/*/tests (globals on, node environment)
yarn build       # tsdown: esm/cjs/global bundles into packages/*/dist (gitignored), config in tsdown.config.ts
yarn lint        # oxlint + publint (publint reads dist, so build first)
```

All four must pass before a PR is opened. CI runs typecheck, test, build, and lint.

## Layout

- `packages/core/src` runtime (TypeScript). Entry `index.ts`; pipeline is
  `createStitches` -> `features/css.ts` -> `convert/toCssRules.ts` -> `sheet.ts`.
- `packages/react/src` the `styled` wrapper. Imports core via relative paths; the build
  bundles core into the react dist.
- `packages/*/types/*.d.ts` the PUBLIC types. Hand-written, and what consumers see. Do not
  break them. `packages/core/src/types.ts` is internal-only and deliberately loose.
- `packages/*/tests` tests. Type-only tests are `*.type-test.ts` and are checked by
  `yarn typecheck`, not run.
- `docs/bench` benchmarks and issue reproductions. Reuse these when fixing a triaged bug.

## Rules

- No `any`. No `as` casts unless there is no other way, and then say why in a comment.
  Types must flow from the code.
- Every bug fix ships with a test in `packages/*/tests` that fails before and passes after.
  For upstream-triaged bugs, start from the matching block in `docs/bench/upstream-repro*.mts`.
- Every behavior change to emitted CSS or class names is a compatibility decision. Call it
  out explicitly in the PR description, even when it fixes a bug.
- Do not merge or copy code from upstream PRs. They are reference material only (roadmap
  section 10.3). Understand the issue and write the fix yourself.
- Do not install tooling, change commit-signing or auth configuration, or add
  dependencies without saying so in the PR. Prefer fixing within what is already here.
- Keep public API stable: `createStitches`, `css`, `styled`, `globalCss`, `keyframes`,
  `createTheme`, and the config shape. New capabilities are opt-in config or new packages.
- Benchmark against `dist`, never against source through tsx, and use
  `docs/bench/interleaved.mts` for A/B numbers. Sequential runs mislead by 5 to 10 percent.

## PR description template

State: what issue or roadmap item this addresses; what changed in emitted CSS or class
names (or "none"); which tests were added; anything you were unsure about.
