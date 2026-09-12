# @stitches/native

Share a stitches theme with React Native, or with anything else that cannot read CSS.

This package holds **no React Native code and no dependencies**. It is plain JavaScript that
turns a theme into plain values, so nothing here can reach a web bundle and nothing in the web
packages reaches here.

```ts
import { createStitches } from '@stitches/react'
import { toNativeTokens } from '@stitches/native'

const { theme, createTheme } = createStitches({
  theme: { space: { 1: '4px' }, colors: { background: 'white' } },
})

const darkTheme = createTheme({ colors: { background: 'black' } })

const light = toNativeTokens(theme)              // { space: { 1: 4 }, colors: { background: 'white' } }
const dark = toNativeTokens(theme, darkTheme)    // { space: { 1: 4 }, colors: { background: 'black' } }
```

Pass the base theme first and the override second. `createTheme()` returns **only** the tokens it
overrides, so a theme made that way is missing most of the set on its own.

## What happens to a value

| Theme value | Result | Why |
|---|---|---|
| `'4px'` | `4` | React Native takes lengths as numbers |
| `'1.6'` | `1.6` | unitless values are numbers too |
| `'white'`, `'#fff'`, `'50%'` | unchanged | not a length |
| `'0 1px 2px $colors$shadow'` | `'0 1px 2px rgba(0,0,0,.2)'` | the reference is resolved |
| a reference to a token the theme does not define | left as `var(--…)`, never a number | guessing would be worse than being visible |

A token's runtime value is its CSS value, so references to other tokens arrive here already
written as `var(--scale-token)` — in a browser the engine resolves those. This resolves them
against the same theme instead, following chains, and stops at a cycle rather than looping.

## What this is not

It does not style anything. There is no `styled` for React Native here, and no opinion about how
you build components. It gives you the same numbers and colours the web uses, so a native UI
stops being a hand-transcribed copy of the theme that drifts.
