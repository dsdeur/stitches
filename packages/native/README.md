# @stitches/native

Stitches for React Native, and for anything else that has no CSS.

It takes **the same config object** the web takes — same theme, same tokens, same variants — and
resolves everything to plain values, because native has no custom properties to defer to.

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

## What it does not do, yet

- **No `styled()`.** That needs React; this package has no dependencies at all today. It is the
  next piece.
- **No responsive values.** `@media` has no counterpart until breakpoints read the window, which is
  a hook, which is part of the same piece as `styled()`.
- **No `utils`.** A web config's utils expand into CSS properties React Native does not have, so
  running them here would produce styles RN silently drops. Native utils are their own decision.
- **Style property names are not checked.** Values and variants are typed; the property surface is
  still structural. Naming every RN property, the way the web packages hand-write their CSS types,
  is its own piece of work.

## Bridging a theme you only have as an object

If you have a web theme object rather than the config that made it, `toNativeTokens(theme, …overrides)`
flattens it the same way. It resolves the `var(--scale-token)` references a live theme carries,
since on the web the browser is what resolves those.
