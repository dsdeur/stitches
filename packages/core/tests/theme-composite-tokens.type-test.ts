import type * as Stitches from '../types/index'
import { createStitches } from '../types/index'

const config = {
	theme: {
		colors: { gray: '#888' },
		borderWidths: { thin: '1px' },
		borders: { default: '1px solid $colors$gray', focus: '2px solid $colors$gray' },
	},
} as const

const { css } = createStitches(config)

// A border shorthand accepts tokens of the borders scale and of colors, plus composite values.
css({ border: '$default' })
css({ borderTop: '$focus' })
css({ outline: '$default' })
css({ border: '$gray' })
css({ border: '$borders$default' })
css({ border: '1px solid $gray' })

type Assert<T extends true> = T
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false

// `borders` is a known scale, so its tokens are typed rather than falling back to a string.
export type BordersScaleIsKnown = Assert<Equals<Stitches.ScaleValue<'borders', typeof config>, '$default' | '$focus'>>

// The scales a property does not name are unaffected.
export type ColorsScaleIsUnchanged = Assert<Equals<Stitches.ScaleValue<'colors', typeof config>, '$gray'>>

// Note: csstype value types include a bare string, so a token typo on `border` is not a type
// error. That is pre-existing (upstream #1092) and unrelated to naming several scales.
