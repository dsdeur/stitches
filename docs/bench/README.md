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
