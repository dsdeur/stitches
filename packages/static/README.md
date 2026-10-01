# @stitches/static

Stitches at build time: every rule your components can produce, written to one stylesheet you
ship like any other css file. The runtime still computes class names, but it no longer writes styles
for anything the file already holds.

```ts
// scripts/build-css.ts, run by your build with tsx, vite-node, bun or similar
import { writeFileSync } from 'node:fs'
import { extractCss } from '@stitches/static'
import { stitches } from '../src/stitches.config'
import * as components from '../src/components'
import * as styles from '../src/styles'

writeFileSync('public/stitches.css', extractCss(stitches, [components, styles]))
```

```html
<link rel="stylesheet" href="/stitches.css" />
```

## What goes in the file

`extractCss(stitches, sources, options?)` walks `sources`, which can be module namespaces, plain
objects, arrays or single values, down to four levels deep, and writes:

- **Components** from `css()` and `styled()`: base styles, the default variants, every value of
  every variant, and every compound variant. An extension (`styled(Button, { … })`) brings the
  rules of what it extends.
- **Responsive values**: every variant value and every compound variant at each breakpoint in
  `config.media`, so `size={{ '@bp2': 'large' }}` is in the file. For a compound variant, every mix
  of its conditions at one breakpoint with the rest plain (`size="lg"` with `outline={{ '@bp2': true }}`). Turn this off with
  `{ responsive: false }` if the file grows too large.
- **Themes** from `createTheme()`, **global styles** from `globalCss()`, and **keyframes**.

It returns `getCssText()`: the instance's whole sheet, including anything your modules rendered
while they loaded.

## How the runtime picks it up

The file carries the same `--sxs` markers server rendering writes. When `createStitches` starts in
the browser, it finds them in the page's stylesheets, marks every rule in the file as already
injected, and renders from there: a component whose rules are all in the file changes no
stylesheet. Nothing in `@stitches/core` or `@stitches/react` changes for this, and nothing about
how you use them either.

In atomic output the file holds every declaration of every style object, plainly and at each
breakpoint, so a declaration that loses in every combination the extractor renders is still there.
The one thing it cannot hold ahead of time is a longhand restated under an earlier breakpoint
shorthand, which exists only for one combination across composition depths; that rule is written
at runtime, and its declaration is already in the file.

Anything the file does not hold is injected at runtime, exactly as today, into the right position
of the same sheet:

- `css` props. They are dynamic by nature.
- A variant value placed at two breakpoints at once (`{ '@bp1': 'a', '@bp2': 'a' }`), and a compound
  variant whose conditions hold at different breakpoints. Each is its own class, and enumerating
  every combination would multiply the file.
- A component the walk did not reach, because it is not exported, or is exported deeper than four
  levels.

Two conditions for the runtime to read the file:

- **Same origin.** A browser does not let scripts read the rules of a cross-origin stylesheet, so
  a file served from a CDN on another domain is not hydrated. The page still renders correctly, but
  the runtime writes every rule again into a sheet of its own.
- **The same config** in the build script and in the browser, including `cascade`, `prefix` and
  `media`. The class names and the markers depend on all three.

## Use `cascade: 'declared'`

Under `'declared'` the position of every rule is a function of what you declared, so the file has
the same order your pages would have had anyway (see [docs/cascade.md](../../docs/cascade.md)).

Under `'legacy'` order within a group is the order rules were first rendered. At build time that is
the order the extractor visits your components, which is not the order your pages render them in
development. A page that relies on that order can look different in production from how it looked
in development. The extractor works in both modes, but `'declared'` is the one that makes the file
predictable.

## One plain stylesheet: `bundleCss`

`extractCss` is for pages that run the stitches runtime. For a page that does not, a cached css
file or an html page exported as a single file, `bundleCss` writes everything as plain css:

```ts
import { bundleCss } from '@stitches/static'

const css = bundleCss(stitches, [components, styles])
const html = `<!doctype html><style>${css}</style>${markup}`
```

In order: themes, global styles and keyframes, every component rule `extractCss` writes, then the
utility classes below. Nothing in it is stitches-specific any more: the hydration markers and the
unconditional `@media{}` groups the runtime keeps rules in are gone, and the rules and their order
are exactly what the runtime would have produced. `toPlainCss(text)` does that step on its own.

Do not load a bundle next to the runtime: without markers the runtime cannot tell the rules are
there, and writes them all again.

## Utility classes

`bundleCss` appends a utility class for every token of every scale your `themeMap` points at, named
after the css property, so an agent or a person writing html can style it with your design system
and no components:

```html
<div class="padding-2 background-color-primary tablet:padding-3 hover:color-text">…</div>
```

- The value is the token's custom property (`var(--space-2)`), so a `createTheme()` class higher up
  switches utilities the way it switches components.
- Breakpoints from `config.media` come as `tablet:` prefixes, in `config.media` order, after the
  plain utilities. States are opt-in: `{ utilities: { states: ['hover', 'focus-visible'] } }`.
- Utilities come after component rules, so `class="${button()} color-primary"` overrides the
  button's color.
- Every property in `themeMap` is a lot of classes for a full theme. `{ utilities: { properties:
['padding', 'gap', 'color', 'backgroundColor'] } }` narrows it; `{ utilities: false }` leaves
  them out.

`utilityClasses(stitches, options)` returns the same set as data (`className`, `property`, `value`,
`media`, `state`), which is the vocabulary to put in an agent's prompt. `utilityCss` returns just
their css.

## Server rendering

If you ship the static file, the server does not need to put `getCssText()` into the page. With
both, the runtime hydrates from whichever sheet it finds first.
