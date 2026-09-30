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
  `config.media`, so `size={{ '@bp2': 'large' }}` is in the file. Turn this off with
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

## Server rendering

If you ship the static file, the server does not need to put `getCssText()` into the page. With
both, the runtime hydrates from whichever sheet it finds first.
