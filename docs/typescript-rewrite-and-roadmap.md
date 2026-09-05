# TypeScript rewrite: status, performance, and roadmap notes

Date: 2026-09-05. Branch: `typescript` (4 commits over `canary`, 142 files).
This is a working document. Nothing in the "Proposals" sections has been built yet.

## 1. Status of the rewrite

**Complete and usable.** Every source and test file is converted.

| Check | Result |
|---|---|
| `npx tsc -p tsconfig.json` (strict) | clean |
| `yarn test` (57 test files) | all pass |
| `yarn build` (esm / cjs / global for stringify, core, react) | pass |
| `yarn lint` (eslint + package quality check) | pass |

Things to know before depending on it:

- **Public types are unchanged.** Consumers still get the hand-written declarations in
  `packages/core/types/*.d.ts` and `packages/react/types/*.d.ts` (about 10.8k lines, 9.8k of
  which is the generated `css.d.ts`). The rewrite did not touch them and `package.json`
  still points at them. The new `packages/core/src/types.ts` (219 lines) is internal and
  deliberately loose (`CSSObject` is a string-indexed record). It is not derived from nor
  checked against the public declarations, so there are now two sources of truth.
  Generating rich public types from source is still open work.
- **CI is broken on Node 16.** `.github/workflows/test.yml` pins Node 16; the test runner
  now uses `tsx`, which requires Node >= 18. TODO: bump CI (and add an `engines` field).
  Not done yet by request.
- **One semantic change.** `createStitches({ root: undefined })` now yields the SSR mock
  sheet (`'root' in init` check) where canary fell back to `document`
  (`typeof init.root === 'object'` check). See `packages/core/src/createStitches.ts:25`.
  Decide whether to keep or restore canary behavior.
- **Not versioned or renamed.** Packages are still `@stitches/core` / `@stitches/react`
  at `1.3.1-1`. To use in our codebases: publish under our own scope or consume via a git
  dependency. API surface is identical, so migration is a package name change.
- The react package imports core through relative `../../core/src/*.ts` paths. The build
  bundles core into the react dist (same as before), so this only matters for repo layout.

## 2. Dependencies and toolchain

**Runtime dependencies: none.** `@stitches/core` and `@stitches/stringify` have zero
dependencies. `@stitches/react` has a single peer dependency, `react >= 16.3.0`.

**Dev dependencies** (root `package.json`, all pinned) and what uses them:

| Package | Current | Latest | Used by |
|---|---|---|---|
| esbuild | 0.13.2 | 0.28.x | `.task/build.js` (bundling via API) |
| terser | 5.9.0 | 5.51.x | `.task/build.js` (minify) |
| acorn + 5 acorn plugins, astring | 8.5.0 | 8.18.x | `.task/build.js` (ESM to CJS / IIFE AST transforms) |
| typescript | 6.0.2 | 7.0.x | typecheck |
| tsx | 4.21.0 | 4.23.x | test runner |
| eslint | 7.32.0 | 10.x | `.task/lint.js` (eslintrc config, not flat config) |
| @typescript-eslint/* | 5.36.2 | 8.x | lint |
| csstype | 3.0.9 | 3.2.x | `.task/build-csstype.js` generates `types/css.d.ts` |
| react, react-test-renderer, @types/react* | 17.x | 19.x | react tests |
| nodemon | 2.0.13 | 3.x | watch modes |
| @types/node | 16.9.6 | 26.x | typecheck |
| prettier | 3.8.2 | 3.9.x | formatting |

Notes for the upgrade pass (not done yet):

- `yarn lint:tsc` (`.task/lint-tsc.js`) is silently ineffective under TypeScript 6: it runs
  `tsc --noEmit <file>` per package, TS 6 rejects that with TS5112 because a `tsconfig.json`
  is present, and the step still exits 0. The only real typecheck is `npx tsc -p tsconfig.json`,
  which has no `package.json` script yet. TODO: add a `typecheck` script and fix or drop `lint:tsc`.
- eslint 7 to 10 requires rewriting the eslintrc config in `package.json` to flat config.
- react-test-renderer is deprecated in React 19. Upgrading react for tests means moving
  the react tests to `react-dom/server` or Testing Library.
- esbuild 0.13 to 0.28 touches a custom build script; expect API changes (e.g. `watch`
  option removal, `write`/`metafile` shape).
- The acorn/astring AST pipeline exists only to produce CJS and global builds. esbuild can
  emit those formats directly; replacing the pipeline would remove 7 dev dependencies.
- `@stitches/test` workspace has its own very old dev deps (typescript-eslint 1.x,
  prettier 1.x); it is a type-test fixture package, so it can be pruned or aligned.

## 2b. Toolchain replacement plan

Decision (2026-09-05): replace the hand-rolled build and test harness with maintained
tools. Not started.

What each dev dependency is really for, and the verdict:

| Group | Packages | Verdict |
|---|---|---|
| Unused | `@radix-ui/react-polymorphic`, `@radix-ui/react-separator` (root deps); the `@stitches/test` workspace's eslint/prettier 1.x set | Remove. Nothing in `src`, `tests`, or `.task` imports the radix packages. |
| Hand-rolled bundler | `esbuild` 0.13, `terser`, `acorn` + 5 plugins, `astring` | Replace. The AST pipeline only converts esbuild's ESM output to CJS and IIFE, which esbuild (and every modern bundler) emits natively. |
| Hand-rolled test runner | `.task/test.js` + `internal/expect.js` (256 lines), `tsx`, `nodemon` | Replace with Vitest. |
| Lint | `eslint` 7, `@typescript-eslint/*` 5 | Keep; upgrade to eslint 9/10 with flat config, or swap for oxlint. |
| Package hygiene | `@skypack/package-check` | Drop. Use `publint` and `@arethetypeswrong/cli` instead. |
| Type generation | `csstype` | Keep. `types/css.d.ts` is generated from it by `.task/build-csstype.js`. |
| React tests | `react` 17, `react-test-renderer` 17, `@types/react*` 17 | Upgrade to 19 with Vitest. `react-test-renderer` is deprecated in 19; tests move to `react-dom/server` / `react-dom/client` under jsdom. |
| Core | `typescript`, `prettier`, `@types/node` | Keep. Bump `@types/node` to the chosen Node version. |

### Build: tsdown (or tsup), not Vite

Vite is an app bundler; for a zero-dependency library with three output formats it adds
Rollup plus an unused dev server. tsdown (Rolldown-based successor to tsup) or tsup gives
ESM, CJS, and IIFE output, minification, source maps, and declaration emit from a short
config, replacing `.task/build.js`, `terser`, and the acorn/astring stack. A future Vite
plugin for static extraction (section 5.1) lives in its own package and is itself built
with tsdown.

Verification: point the existing test suite at `dist` and compare emitted CSS from
`getCssText()` for the benchmark fixtures byte-for-byte against the current build.

### Tests: Vitest

Replaces `.task/test.js`, the custom `expect`, `tsx`, `nodemon`, and the
`test-globals.d.ts` shims. Handles TypeScript natively; `expectTypeOf` covers the
`*.type-test.ts` files that today are only checked by `tsc`. React tests run in the jsdom
environment with `react-dom`. Migration is mechanical: tests already use `describe` /
`test` / `expect` with Jest-style matchers, so most files need an import line. The custom
`toNotBe` / `toNotEqual` / `toNotBeInstanceOf` / `toNotThrow` matchers become `.not.*`.

### Net effect

About 25 dev dependencies become about 10: typescript, vitest, jsdom, tsdown, eslint +
typescript-eslint, prettier, publint, csstype, react + react-dom, @types/node. `.task/`
shrinks to `build-csstype.js` and `release.js`.

### Order

1. Vitest first; it keeps the suite green across the other swaps.
2. tsdown for the build, verified against current dist behavior.
3. eslint flat config and publint.
4. React 19 for tests (depends on 1).
5. Then the Node / CI bump from section 1 lands naturally with the new `engines` field.

## 3. Performance

### 3.1 Is the TS build slower? No.

A first pass (canary first, then ts, sequential) showed the TS dist 3 to 9 percent slower.
An interleaved run of the same case (alternating builds each round, 12 rounds, 300k
renders per round) shows the opposite ordering, i.e. the difference is run-order and
thermal drift, not code:

| Build | min | median | max |
|---|---|---|---|
| canary dist | 2187 ns | 2317 ns | 2610 ns |
| typescript dist | 2161 ns | 2193 ns | 2552 ns |

Running the TS source through `tsx` (which transpiles at load) is 5 to 15 percent slower
than native JS; that is the transpile path, not the shipped build. Always benchmark dist.

A prettified diff of the two minified dists confirms they differ almost only by identifier
names. The real differences, none in the render hot path:

1. `createMemo` restructured (compute then assign, no rest args).
2. `toCssRules`: added `!Array.isArray(data)` to the rule-like check and an explicit
   `String(data)` before `toSizingValue`. Both are no-ops for valid input.
3. `createSheet` builds the group-sheet object up front instead of lazily.
4. `css.withConfig` attached via `Object.assign` instead of property assignment.
5. Deferred injector closes over a local array instead of a symbol-keyed property.

Bundle size: core 6.02 kB to 6.20 kB gzip (+3%), react 6.28 kB to 6.45 kB gzip.

### 3.2 Where render time goes

Warm render of a component with 3 variants + 1 compound + a `css` prop, `--cpu-prof`,
inlining disabled for attribution:

| Function | Self time |
|---|---|
| `toHash` chain (`JSON.stringify` + `toPhash` + `toAlphabeticName`) | ~51% |
| `render` body (props spread, Set, loops, template strings) | ~31% |
| `getTargetVariantsToAdd` | ~4% |
| GC | ~3% |

Every render calls `toHash(vStyle)` for each matched variant to build the variant class
name (`packages/core/src/features/css.ts`, `createRenderer`, `variantClassName`). Those
hashes never change for non-responsive variants, yet they are recomputed via
`JSON.stringify` on every render. The `css` prop is also hashed per render.

### 3.3 What is already proper

- Injection happens once per class: each sheet group has a `cache` Set checked before
  `toCssRules` runs. Warm renders never touch the CSSOM.
- Class names are content hashes, so identical styles dedupe across components.
- Empty variants are flagged at composer creation (`!hasNames(style)`) and skipped.
- Variant match keys are pre-stringified at composer creation.
- Config memoization (`createMemo`) means repeated `createStitches(sameConfig)` is free.
- Cold path: ~19 us per component first render including CSS generation and injection;
  `getCssText()` for 5000 components (2.8 MB) takes ~8 ms. Fine for SSR.

### 3.4 Optimization candidates (in order of payoff)

1. **Precompute variant hashes** at composer creation; for responsive wrappers key the
   hash by the joined media string. Expected: roughly halves warm render cost. No API change.
2. **Memoize the whole class string per component** keyed by a string built from the
   variant props (only for the non-responsive, no-`css`-prop case). Turns the common render
   into string-build + Map lookup.
3. **Identity cache for the `css` prop**: `WeakMap<object, className>` so stable objects
   skip `JSON.stringify`. Fresh literals still hash.
4. Minor allocations: `{...props}` copy, `new Set([...baseClassNames])`, the arrays from
   `getTargetVariantsToAdd`, the `className.split(/\s+/)` regex. Together well under 10%.

Reproduce: `docs/bench/README.md`.

## 4. Composition order (the `!important` problem)

Confirmed and reproducible (`docs/bench/order.mts`). The sheet is bucketed by rule kind:
`themed, global, styled, onevar, resonevar, allvar, inline`. It is not bucketed by
composition depth. So:

```ts
const A = css({ color: 'black', variants: { tone: { muted: { color: 'gray' } } }, defaultVariants: { tone: 'muted' } })
const B = css(A, { color: 'red' })
B() // renders gray: A's variant sits in the later `onevar` bucket and beats B's base style
```

Cases that are fine today: a component's own variants beat its own base; extension chains
(`css(css(css(X)))`) inject base-first so deeper always wins for base styles.

Case that is not fixable by ordering: two unrelated components merged via `className`;
which wins depends on which rendered first and there is no declared intent.

**Proposal: order by depth first, kind second, using CSS cascade layers.** One layer per
(depth, kind) pair, declared up front (`@layer d0-styled, d0-onevar, ..., d1-styled, ...`).
Selectors keep their flat `:where()` specificity. Existing `!important` overrides keep
working. The SSR hydration marker (`--sxs`) gains a layer id. Ship behind a config flag
(e.g. `cascade: 'layers'`), then flip the default. Touches `sheet.ts` and `css.ts` only.
Requires browsers with `@layer` (all evergreen since 2022).

## 5. Explorations

### 5.1 Static extraction (stylex-like build-time CSS)

Most tractable of the three, because stitches is already deterministic:

- Class names are hashes of the style object.
- `toCssRules` is pure given the config.
- The runtime already has a hydration mode: it reads `--sxs` markers from an existing
  stylesheet and marks those classes as injected so it never re-injects.

Build-time extraction is that hydration mode generalized:

1. A build script imports the app's style modules in Node (like vanilla-extract's
   `.css.ts` model; no AST evaluation needed because we run the real config).
2. For each component, walk `component[internal].composers` to enumerate every singular
   variant, compound variant, and responsive combination (all finite: media keys come from
   config). Render each once. Do the same for `globalCss`, `keyframes`, `createTheme`.
3. Write `getCssText()` to a `.css` file in bucket (or layer) order.
4. Runtime is booted in "pre-hydrated" mode with the cache Sets populated from the static
   file, so it only computes class strings.

What stays dynamic: `css` props with non-literal values. They already inject into the
last bucket, so ordering stays correct. A strict mode can forbid them (stylex does).

This also dissolves the "no proper SSR" complaint, whose real cause is a single
process-global sheet that accumulates rules across requests.

Packaging: `@stitches/compiler` (or `static`) with a Vite/Next plugin. No core API change.

### 5.2 Utility class stylesheet (for agents writing HTML)

Goal: a stylesheet with readable utility class names that reuses our tokens and themes, so
an agent producing raw HTML can style it without the component runtime.

Two designs, both viable:

- **A. Theme-derived utility sheet (generator).** Iterate `themeMap` (property to scale)
  times theme tokens, plus responsive prefixes from `media`, plus a state prefix set.
  Emit `.p-2 { padding: var(--space-2) }` style rules and a compact vocabulary file
  (class list) for the agent prompt. Zero runtime, reuses `toCssRules` and the config,
  coexists with component styles if placed in a later layer.
- **B. Atomic output mode for the component runtime** (one class per declaration, like
  stylex). Constraint: selector-based targeting (`Comp.selector`, `${Comp} &`, descendant
  selectors that assume one class per component) is unavailable in that mode.

Decision note (2026-09-05): the usage constraint in B is acceptable ("components must be
used a certain way, same as `li` in `ul`"). So B is not ruled out. Open question: which
one actually serves the agent use case. A is what an agent writing HTML consumes; B is
about component CSS output size. They can also be combined (B for components, A for the
agent vocabulary, one sheet).

### 5.3 React Native

What transfers: config shape (theme, media as breakpoints, utils), variants / compound /
default variants, `$token` strings, `createTheme` switching, and the type machinery.

What does not: CSS variables (tokens must resolve to values via a theme context),
selectors / pseudo-classes / media queries (responsive variants map to
`useWindowDimensions` breakpoints), units (RN numbers are unitless), and the property set
(RN `ViewStyle | TextStyle | ImageStyle` instead of csstype).

**Proposed `@stitches/native`.** Same `createStitches(config)`, `styled(View, {...})`.
Renderer merges style objects: base, then variants, then compound, then `css` prop.
Object merge means later wins, so composition order is respected for free. Tokens resolve
through a `ThemeProvider`; `createTheme` returns a value map instead of CSS vars. Types
built from the existing `CSS<Config>` generics with the property source swapped.

**RN-subset to CSS (react-native-web style).** Most of the RN subset is already
expressible on web via stitches `utils` (`paddingHorizontal`, `marginVertical`, etc. are
two-line utils) plus View/Text base resets. Only `transform` arrays and `shadow*` /
`elevation` need real converters. Recommendation: define the shared vocabulary as the RN
subset + tokens + variants for shared primitives (a `@stitches/native-preset` of utils
on web), and let web-only components keep full CSS. Do not try to run CSS on native.

Order of work: settle the shared vocabulary first; the native renderer is the largest
item on this list.

## 6. Themes and composite tokens

### 6.1 Composite border token

Goal (clarified 2026-09-05): one token that holds the **full** border declaration,
e.g. `borders: { default: '1px solid $colors$border' }`, used as `border: '$borderDefault'`
or `border: '$default'`.

**This works at runtime today**, verified (`docs/bench/border.mts`):

```ts
createStitches({
  theme: {
    colors: { gray: '#888' },
    borderWidths: { thin: '1px' },
    borders: { default: '$borderWidths$thin solid $colors$gray' },
  },
  themeMap: { ...defaultThemeMap, border: 'borders', borderTop: 'borders', outline: 'borders' },
})
css({ border: '$default' })
// emits:
//   --borders-default: var(--borderWidths-thin) solid var(--colors-gray)
//   .c-xxx { border: var(--borders-default) }
```

Without the `themeMap` override, the scale-qualified form `border: '$borders$default'`
also works with zero config. Custom scales are accepted by the public `Theme` type
(`[Scale in keyof T]` in `types/config.d.ts`).

Gaps:

- `defaultThemeMap` maps `border` (and `borderTop`, `outline`, ...) to `colors`, so a bare
  `$default` looks in the wrong scale unless overridden.
- Flipping that default would break the very common `border: '1px solid $gray'`, where
  `$gray` currently resolves to `--colors-gray` through the same mapping.
- Type autocomplete for a `borders` scale on the `border` property.

**Proposal: multi-scale lookup in `themeMap`.** Allow `border: ['borders', 'colors']`.
Resolution: a bare `$token` resolves to the first listed scale that defines the token in
`config.theme`; if none does, fall back to the first scale (current behavior). This keeps
`1px solid $gray` working, makes `border: '$default'` work with the default map, and is a
small change in `toTokenizedValue` (it needs the theme, which it does not receive today)
plus types. Add `borders` to the default scales and map the border/outline shorthands to
`['borders', 'colors']`.

### 6.2 Composite style templates (token expanding to several declarations)

E.g. a typography preset (`fontSize` + `lineHeight` + `fontWeight`). Today this is `utils`
territory, not theme territory, and a CSS var cannot hold multiple declarations.
Possible feature: a typed theme-level `mixins` section whose values are style objects,
expanded at style time like a util (`text: '$heading'`), theme-switchable when its
values are token references. Small change in `toCssRules` plus types. Lower priority than
6.1.

## 7. Constraints

- Multiple large codebases use stitches. Every item above is additive (new packages or
  opt-in config flags) except the cascade-order fix, which goes behind a flag first.
- `createStitches`, `css`, `styled`, `globalCss`, `keyframes`, `createTheme`, and the
  config shape stay as they are.
- What we like and must preserve: trivial to include, the composition model, tokens and
  themes, template-string token typing.

## 8. Suggested order

1. Ship the TS branch under our scope: bump CI to Node 18+, decide the `root` semantics,
   version and publish.
1b. Toolchain replacement (section 2b): Vitest, then tsdown, then eslint flat config +
   publint, then React 19 for tests. Can run in parallel with items 2 to 4.
2. Precompute variant hashes (3.4 item 1).
3. Cascade layers for composition order (section 4).
4. Composite border tokens via multi-scale `themeMap` (6.1).
5. Static extraction (5.1).
6. Utility sheet (5.2), after deciding A vs B vs both.
7. Native adapter (5.3), after settling the shared vocabulary.

## 9. Open questions

- Keep or restore canary's `root: undefined` behavior?
- Utility classes: design A, B, or both?
- Cascade layers: acceptable to require `@layer` support, or keep a non-layer fallback?
- Type generation: keep hand-written `types/*.d.ts` as the public surface, or derive from
  source? (Large effort; the current split works.)
- Dev toolchain: decided, see section 2b (tsdown + Vitest). Remaining choice: eslint 10 vs oxlint.
