# @stitches/native

Stitches for React Native, and for anything else that has no CSS.

It takes **the same config object** the web takes — same theme, same tokens, same breakpoints, same
variants — and resolves everything to plain values, because native has no custom properties to
defer to.

```ts
import { createStitches } from '@stitches/native'
import { View } from 'react-native'

const { css, theme, createTheme } = createStitches({
  theme: {
    colors: { background: 'white', text: '#0c0c11' },
    space: { 1: '4px', 2: '8px' },
    radii: { default: '6px' },
  },
})

const card = css({
  padding: '$1',
  backgroundColor: '$background',
  borderRadius: '$default',
  variants: {
    size: { large: { padding: '$2' } },
    raised: { true: { shadowOpacity: 0.1 } },
  },
  defaultVariants: { size: 'large' },
})

<View style={card({ raised: true })} />
// { padding: 8, backgroundColor: 'white', borderRadius: 6, shadowOpacity: 0.1 }
```

`css()` returns a style object, so it goes straight into a `style` prop. Nothing renders here and
nothing is injected anywhere.

## What carries over from the web

- **Tokens.** `'$1'` resolves against the scale the property maps to; `'$colors$text'` names a
  scale outright. References inside the theme resolve too, so `box: '0 1px 2px $colors$shadow'`
  arrives as a finished value.
- **Units.** `'4px'` becomes `4`, `'50%'` stays a string, and what React Native takes as an object
  or array (`shadowOffset`, `transform`) passes through untouched.
- **Variants**, compound variants and default variants, with the same prop shape and the same
  boolean shorthand (`{ raised: { true: … } }` takes `raised={true}`).
- **Composition.** `css(base, { … })` extends, keeping the base's variants, and the extension wins.
- **Themes.** `createTheme()` resolves over the default one; pass the result as the second argument
  to any style function.

## Order is the order you wrote

Depth first, then base before variants before compound variants, then declaration order, and the
`css` prop last of everything — the same rules as `cascade: 'declared'` on the web, which
[docs/cascade.md](../../docs/cascade.md) sets out in full. On native this falls out of merging
objects in that order, so there is no sheet and no specificity to reason about.

## Components: `@stitches/native/react`

The main entry has no dependencies and no React, so it serves any renderer. Components live in a
second entry, with `react` as an optional peer:

```tsx
import { createStitches } from '@stitches/native/react'
import { Text, View, useColorScheme, useWindowDimensions } from 'react-native'

const { styled, Provider, createTheme, theme, useTheme, useStyle } = createStitches({
  theme: { colors: { background: 'white', text: '#0c0c11' }, space: { 1: '4px', 2: '8px' } },
  media: { tablet: '(min-width: 768px)' },
})

const dark = createTheme({ colors: { background: '#0c0c11', text: 'white' } })

const Card = styled(View, {
  'padding': '$1',
  'backgroundColor': '$background',
  '@tablet': { padding: '$2' },
  'variants': { raised: { true: { shadowOpacity: 0.1 } } },
})

export const App = () => (
  <Provider theme={useColorScheme() === 'dark' ? dark : theme} viewport={useWindowDimensions()}>
    <Card raised={{ '@initial': false, '@tablet': true }} testID="card" />
  </Provider>
)
```

- `styled(Component, …definitions)` puts the resolved style in `style`, in front of a `style` you
  pass (React Native flattens the array, so yours still wins). Variant props are taken off, as on the
  web; everything else, the ref included, reaches the component. `css` overrides last, and `as`
  swaps the component. `styled(Card, { … })` extends a styled component; a `css()` style function
  works as a definition too. `Card.style(props)` gives the style object without rendering.
- `Provider` sets the theme and the window size for everything below it. Providers nest, and an
  inner one inherits whatever it leaves out. `viewport={useWindowDimensions()}` is the whole
  integration: this package never imports `react-native`.
- `useTheme()` returns the nearest provider's resolved theme, for a value that is not a style (an
  icon colour, a chart).
- `useStyle(card, props)` resolves a `css()` function under the nearest provider, without adding a
  component to the tree: `<View style={useStyle(card, { size })} />`.

## Performance

Native has no stylesheet to amortise into, so every render pays for its style. The design goal is
that this payment is a lookup, not work:

- Each style function caches its result per theme, per set of matching breakpoints and per variant
  selection, in a tree keyed by the prop values themselves. A warm lookup is a handful of `Map`
  reads, about 50 ns, and returns **the same object** each time, so React Native can skip diffing it.
- Breakpoints are evaluated once per window size, by the `Provider`, not by each component.
- `styled()` reads its variants straight from its props and makes the one copy of the props any
  wrapper makes (to leave the variants out).

- A window size change (rotation, split screen, a resized tablet window) re-renders only the
  components whose styles can depend on it: a breakpoint block in their definitions or `css` prop,
  or a per-breakpoint prop. The rest do not even read the window (with React 19's `use`; older React
  reads it always and re-renders them, correctly but not selectively). A theme change re-renders
  everything that resolves tokens, since their styles change.

Measured with `docs/bench/native-render.mts` (production React, 1000 cards rendered 21 times,
interleaved), against a component that passes a style object computed once by hand:

|                                         | added per card render     | vs hand-computed |
| --------------------------------------- | ------------------------- | ---------------- |
| a bare `forwardRef` wrapper, no styling | within noise, under 20 ns | 0–4%             |
| `useStyle(card, props)`                 | 60–85 ns                  | 10–15%           |
| `styled(View, …)`                       | 60–85 ns                  | 10–15%           |

Before the cache tree and the per-window breakpoints (same benchmark): `styled` added about 1.3 µs
per card, +219%.

The percentages are against server rendering, which is far cheaper per element than a real React
Native host view, so on a device the share is smaller; the absolute cost is the number to watch.
For a long list, `useStyle` adds no component to the tree at all.

## Responsive values

The web config's `media` works here, read against the viewport instead of by a browser:

- **`'@tablet': { … }` in a style** applies over the properties beside it when the breakpoint
  matches. Several matching blocks apply in `config.media` order.
- **Variant props per breakpoint**, `size={{ '@initial': 'small', '@tablet': 'large' }}`, with the
  web's semantics: `@initial` defaults to the default variant, and every value whose breakpoint
  holds applies, in `config.media` order. So a property only the `@initial` value sets survives a
  breakpoint whose value leaves it alone, exactly as the two css rules would on the web. A compound
  variant applies while each of its values is active.
- **Raw queries**, `'@media (orientation: landscape)'`, work in both places.

Understood: `min-`/`max-` `width` and `height` in px, em or rem, range syntax (`width >= 768px`,
`400px < width <= 800px`), `orientation`, the `screen` and `all` types, `and`, and commas. Anything
else (`hover`, `prefers-color-scheme`, `not`) never matches. A window size cannot answer it, and a
style that never applies is easier to notice than one that always does. With no viewport at all,
only `@initial` applies. Outside React, pass the viewport as `css()`'s third argument:
`card(props, theme, { width, height })`.

## What it does not do, yet

- **No `utils`.** A web config's utils expand into CSS properties React Native does not have, so
  running them here would produce styles RN silently drops. Native utils are their own decision.
- **Style property names are not checked.** Values and variants are typed; the property surface is
  still structural. Naming every RN property, the way the web packages hand-write their CSS types,
  is its own piece of work.
- **No `withConfig`.** A variant named like a prop the wrapped component also takes (`disabled` on
  `Pressable`) is taken off, as it is on the web, and there is no `shouldForwardStitchesProp` yet
  to forward it anyway.

## Bridging a theme you only have as an object

If you have a web theme object rather than the config that made it, `toNativeTokens(theme, …overrides)`
flattens it the same way. It resolves the `var(--scale-token)` references a live theme carries,
since on the web the browser is what resolves those.
