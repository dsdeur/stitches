# Benchmarks and reproductions

Referenced from `../typescript-rewrite-and-roadmap.md`. Run from the repo root with tsx.

- `render.mts <module-path> <label>`: render throughput across scenarios (warm variants,
  responsive, `css` prop, composition, cold injection, `getCssText`). Always point it at a
  built dist, not the TS source, because tsx transpiles source at load and skews results.

  ```bash
  yarn build && npx tsx docs/bench/render.mts ./packages/core/dist/index.mjs ts
  ```

- `interleaved.mts <canary-dist> <ts-dist>`: alternates two builds each round to cancel
  run-order drift. Use this for A/B comparisons; sequential runs mislead by 5 to 10 percent.

  ```bash
  git worktree add /tmp/stitches-canary canary && (cd /tmp/stitches-canary && ln -s "$PWD/../stitches/node_modules" node_modules && node .task/build.js --only @stitches/core)
  npx tsx docs/bench/interleaved.mts /tmp/stitches-canary/packages/core/dist/index.mjs ./packages/core/dist/index.mjs
  ```

- `profile-summary.mjs <dir>`: aggregates self time by function from a `.cpuprofile`.

  ```bash
  node --cpu-prof --cpu-prof-dir=/tmp/prof some-hot-script.mjs && node docs/bench/profile-summary.mjs /tmp/prof
  ```

  Add `--no-turbo-inlining` to the profiled run for per-function attribution.

- `order.mts`: reproduces the composition-order cases from section 4 of the roadmap.
- `border.mts`: shows a composite border token working with a `themeMap` override.
- `upstream-repro.mts`, `upstream-repro2.mts`: reproductions of the upstream issues triaged
  in section 10 of the roadmap (responsive `@initial` drop, time units, dots in variant
  names, tokens inside `url()`, order-of-first-render bugs, cyclic `root`, `@import`).
  Each block prints the emitted CSS and a one-line note on what is wrong.
- `classname-parity.mts <core-entry>`: renders a fixture covering base, singular, compound,
  responsive, composed, and `css`-prop cases and prints class names plus `getCssText()`.
  Run it against `next` and against a PR branch (a worktree works) and `diff` the outputs;
  any runtime PR that claims "no class-name or CSS change" must produce identical files.
- `cascade-audit.mts legacy.css declared.css page.html`: migration aid for `cascade: 'declared'`
  (roadmap section 11.5). Feed it `getCssText()` output of the same render in each mode plus the
  rendered HTML; it resolves the winning declaration per element, viewport, selector suffix and
  property in both sheets and prints every difference. Exit code 1 when anything differs.
- `type-perf/`: a consumer with `strict: false`, 40 deeply composed components, custom scales,
  utils and `VariantProps`, for upstream #1038 (type-checking without `strict` reportedly taking
  minutes). Run `npx tsc -p docs/bench/type-perf/tsconfig.json` and time it, with
  `"strict": false` and `true`. Measured 2026-09-05 on TypeScript 6, three warm runs each:
  2.2 to 3.0s without `strict`, 2.3 to 2.9s with it, so the two are indistinguishable and the
  reported blowup does not reproduce. Re-run this before acting on a slow-typecheck report.

## Consumer module resolution (run before publishing)

The public types resolve differently per consumer `moduleResolution`, and only a real consumer
proves it. There is nothing to check in, because it needs a `node_modules` layout, so recreate it:

```bash
mkdir -p /tmp/resolve/node_modules/@stitches && cd /tmp/resolve
ln -s "$PWD"/../../Users/durge/dev/stitches/packages/react node_modules/@stitches/react   # adjust the path
ln -s "$PWD"/../../Users/durge/dev/stitches/packages/core node_modules/@stitches/core
# write an app.ts that imports createStitches, styled, css and the CSS type from '@stitches/react',
# then type-check it once per mode with the repo's compiler:
../stitches/node_modules/.bin/tsc --noEmit --strict --declaration --jsx react \
  --module NodeNext --moduleResolution NodeNext app.ts
```

Measured 2026-09-05: `bundler` 0 errors, `nodenext` 0 errors (3 before the missing `.js`
extension in `packages/react/types/stitches.d.ts` was added), legacy `node` 0 errors apart from
TypeScript 6 deprecating the option itself. `packages/core/tests/public-types-imports.js` guards
the extension rule so it cannot regress silently.
