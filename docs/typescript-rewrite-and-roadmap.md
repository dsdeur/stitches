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
- **CI was broken on Node 16.** Fixed 2026-09-05: CI now reads `.nvmrc` (Node 22), runs
  typecheck, test, and build, and `package.json` declares `engines` and `packageManager`.
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
  now exposed as `yarn typecheck` (added 2026-09-05) and run in CI. TODO: drop or fix `lint:tsc`.
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
   hash by the joined media string. **Done 2026-09-05** (PR #1): warm render with 3 variants + compound
   dropped 35% in the interleaved dist benchmark; class names and emitted CSS verified
   byte-identical with `docs/bench/classname-parity.mts`. No API change.
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

Update (same day, after upstream triage): this is one instance of a wider family. See
section 10.1 A for the general fix: sheet order as a pure function of declarations.

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

## 8. Task queue (the single authoritative order)

This is the one list agents and people pick work from. Section 10.6 used to be a second
list; it now points here. Items marked done stay for context.

1. Ship the TS branch under our scope: decide the `root` semantics, version, publish.
   Node and CI preparation done 2026-09-05.
2. Toolchain replacement (section 2b): Vitest, then tsdown, then eslint flat config +
   publint, then React 19 for tests. May run in parallel with 3 to 5; runtime PRs open at
   the same time rebase onto it.
3. Precompute variant hashes (3.4 item 1). Done 2026-09-05, PR #1.
4. Deterministic sheet order (10.1 A; subsumes the cascade-layers item in section 4).
   Fixes six upstream threads and our own `!important` pain.
5. Own fixes for the packaging and theme-map gaps (10.2 row 1, 10.1 H): `exports.types`
   order, `./types/*` export, `accentColor` and logical border colors. One PR, with tests.
6. Small confirmed bugs, one PR each, repro already in `docs/bench`: 10.1 B (responsive
   `@initial`), C (tokens in `url()`), D (dots in variant names), E (time units), F (cyclic
   `root`).
7. Own text cache for `getCssText` (10.1 G); unblocks a Next app-router recipe.
8. `out` variance annotations on the `CSS<...>` generics (10.2).
9. Composite border tokens via multi-scale `themeMap` (6.1).
10. Static extraction (5.1).
11. Utility sheet (5.2), after deciding A vs B vs both.
12. Native adapter (5.3), after settling the shared vocabulary.

## 9. Open questions

- Keep or restore canary's `root: undefined` behavior?
- Utility classes: design A, B, or both?
- Cascade layers: acceptable to require `@layer` support, or keep a non-layer fallback?
- Type generation: keep hand-written `types/*.d.ts` as the public surface, or derive from
  source? (Large effort; the current split works.)
- Dev toolchain: decided, see section 2b (tsdown + Vitest). Remaining choice: eslint 10 vs oxlint.

## 10. Upstream issue triage (stitchesjs/stitches)

Date: 2026-09-05. Upstream has 112 open issues and 8 open PRs; the last release is 1.2.8
(`latest`) with `1.3.1-1` on the `canary` npm tag. Our `canary` branch is identical to
upstream `canary` (same head) and carries 268 commits that upstream `main` never released.
Upstream `main` only differs by a gridGap fix that was reverted. So we are not missing any
upstream code; the value is in the open issues and unmerged PRs below.

Every "confirmed" row was reproduced against this branch (`docs/bench/upstream-repro.mts`
and `upstream-repro2.mts`). Engagement is reactions + comments on the upstream issue.

### 10.1 Confirmed bugs, grouped by root cause

**A. Rule order inside a bucket is first-render order, not declaration order.** This is one
bug with many faces and the highest-engagement family upstream (#913 has 44, #1039 has 33,
#976 has 18). Within each sheet bucket (`styled`, `onevar`, `resonevar`, ...) rules are
appended when a class is first rendered. Anything that changes render order changes the
cascade: client-side navigation, code splitting, SSR vs. hydration, or two components
sharing a style hash.

| Issue | Engagement | Symptom |
|---|---|---|
| #913 | 44 | Extended component loses to base after client navigation |
| #1039, #976 | 33, 18 | `styled(A, over)` and `styled('div', over)` share a hash; whichever renders first fixes the order |
| #1060 | 12 | `css()` class passed via `className` cannot override a variant |
| #1009 (P1) | 5 | Variant priority depends on which variant value rendered first |
| #885 | 16 | Responsive: `@md` rule injected after `@lg` beats it at wide viewports |
| #642, #690 | 15, 4 | Same family, older reports |

Fix direction: make the sheet order a pure function of declarations, not of render
history. Order by (composition depth, rule kind, declaration index within the component,
media-key index from `config.media`). All four are known when the component is created,
so the position of every rule is deterministic. This subsumes the cascade-layers proposal
in section 4 and is also what static extraction (5.1) needs. Implementation: either
`@layer` per (depth, kind) with per-media sub-buckets, or insert at computed indices
instead of appending. This is the single most valuable fix for our codebases.

**B. Responsive variant matching drops `@initial` when another breakpoint has the same
value** (#1146, #896; 10 engagement). In `getTargetVariantsToAdd`, a value that matches
both `@initial` and a media key gets wrapped in `@media` once, so the unwrapped `@initial`
rule is never emitted. Reproduced: `{ '@initial': 'red', '@small': 'blue', '@medium': 'red' }`
yields no un-wrapped `color: red`. Fix: emit the bare rule when `@initial` matched, and
the media-wrapped rule separately.

**C. Token replacement runs inside `url()` and string literals** (#986; 4). `$` or `--`
followed by a word inside a URL or quoted string becomes `var(...)`. Reproduced:
`url(/img/logo$dark.png)` and `content: '"price: $5"'` are both mangled. Upstream merged a
fix (#1066) and reverted it (#1107) because it broke other cases. Fix: skip replacement
inside `url(...)` and inside quoted strings in `toTokenizedValue`.

**D. Dots in variant values produce unescaped class names** (#923; 2). `size: '1.5'` emits
`.c-x-size-1.5` which selects nothing. Fix: escape `.` (and other non-ident characters)
when building variant class names; the hash already covers uniqueness.

**E. Number values on time properties get `px`** (#1069; 1). `animationDelay: 200` emits
`200px`. Reproduced for `animationDelay`, `animationDuration`, `transitionDuration`. Fix:
add the time properties to the unitless list (emit the bare number, or `ms`; unitless
is the safer choice because it matches React's `style` behavior).

**F. `root` option crashes on cyclic objects** (#832, #1004 PR; #628 and #1048 want the
feature). `createMemo` stringifies the whole init object, so `root: document` or a shadow
root can throw "Converting circular structure to JSON". Reproduced with a cyclic object.
Fix: exclude `root` from the memo key (identity-compare it) rather than adopting the
PR's safe-stringify. Shadow DOM support (#628, #1048) then becomes viable.

**G. `getCssText()` on the client re-serializes the CSSOM** (#1094; 3, #1166). Browsers
expand shorthands and reorder declarations in `cssRule.cssText`, so client-side output can
be invalid (`padding-top: ;`) or misordered (`all: unset`). Server output is fine. Fix:
keep the injected `cssText` strings per bucket and serialize from that cache instead of
reading back from the CSSOM. Also removes the `--sxs` marker parsing on the read path.

**H. Small correctness gaps.** `msOverflowStyle` emits `ms-overflow-style` (missing leading
dash; the `Webkit`/`Moz` prefixes are correct). `defaultThemeMap` lacks `accentColor`,
`borderInlineColor`, `borderBlockColor` (open PRs #1110, #1159). `@import` values are
quote-wrapped, which breaks the `url(...)` form.

### 10.2 Types and packaging (affects every consuming codebase)

| Issue / PR | Engagement | Problem | Action |
|---|---|---|---|
| #1055, #1160, #833 | 38, 11, 20 | "inferred type cannot be named without a reference to `@stitches/react/types/...`" when a package re-exports `styled` with `declaration: true` or `moduleResolution: bundler` | Put `types` first in `exports` (conditions are matched in order) and export `./types/*`; PRs #1150 and #1115 point at the same thing. Our `exports` currently lists `types` last. Beyond that, the fix is exporting named, stable types for `CSS`, `VariantProps`, and the config so consumers can annotate. |
| #1038 | 20 | Type-checking without `strict` takes minutes | Add `out` variance annotations on the `CSS<...>` generics in `css-util.d.ts` (suggested in-thread, TS 4.7+). Cheap; verify with the reporter's repro. |
| #1132 | 0 | Numeric-string variant keys widen `VariantProps` to `number` | Types fix in `styled-component.d.ts`. |
| #1092, #1021, #749, #848 | low | Misc typing gaps (unknown properties accepted, `Token` not assignable, `as` + variants on composed components) | Backlog; revisit once we decide whether public types stay hand-written (section 9). |

### 10.3 Open upstream PRs (reference only, do not merge)

Policy (2026-09-05): we do not adopt upstream PRs. Unknown authors, no review capacity, and
the fixes are small enough to write ourselves from an understanding of the issue. The PRs
are listed as pointers to the problem and as one possible approach, to be read with
skepticism. Each fix we write gets its own test.

| PR | Size | What |
|---|---|---|
| #1150 | 3 files | `exports.types` first (fixes 10.2 row 1) |
| #1115 | 2 files | export `./types/*` |
| #1110 | 1 line + types | `accentColor` to `colors` |
| #1159 | 12 lines | logical border color properties to `colors` |
| #1165 | 1 line | claims `@import` must be at index 0; not reproduced on the mock sheet. Verify the hydration case before changing anything |
| #1154 | 1 line | `mask` property (check the type only) |
| #1004 | 92 lines | vendors a safe-stringify for `root`; the right fix is the smaller one in 10.1 F |

### 10.4 Not bugs, or not ours

- #1085 (util and variant share a name): does not reproduce; the reporter's code has
  `defaultvariants` lower-cased.
- #1135 (`WebkitBackgroundClip` prefix stripped): does not reproduce on this branch.
- #1129 (page freeze): the reporter's `Text` component renders itself.
- #1046 (boolean responsive `false`): by design, a `false` variant must exist to emit a
  rule; document it.
- #570 (`css()()` returns an object): by design, it has `toString`; `String(c())` works.
  Worth documenting, or returning a string with properties in a major.
- #882 (cannot override a default variant from `styled(Base, {...})`): by design today;
  fixed by 10.1 A.

### 10.5 Feature requests that overlap the roadmap

| Issue | Engagement | Maps to |
|---|---|---|
| #820 SSR accumulates all styles | 19 | 5.1 static extraction / per-request sheet |
| #1117 CSS layers | 5 | 10.1 A |
| #628, #1048 shadow DOM / constructable stylesheets | 25, 15 | 10.1 F, then adopt constructable sheets |
| #1143 container queries | 17 | small: allow `@container` in media map |
| #1091 themeable breakpoints, #933 responsive defaultVariants, #1133 simpler responsive API | 10, 6, 8 | responsive design pass after 10.1 A/B |
| #1049 get rendered CSS from a component, #904 `resolveToken` | 4, 2 | fall out of 5.1 and the native token resolver in 5.3 |
| #1109 Next 13 app router | 248 | needs a `useServerInsertedHTML` recipe; depends on 10.1 G for correct client output |

### 10.6 Priority for the fork

Folded into section 8, which is the single task queue. Kept as a heading so older links
resolve.
