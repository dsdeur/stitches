// What a consumer sees. The tests next door import core's internal types, which say a theme is
// `[scale: string]: unknown`, so the scales disappear there; the public types keep them, and this
// is where that is checked.
import { createStitches } from '../../core/types/index'
import { toNativeTokens } from '../src/index.ts'

const { theme, createTheme } = createStitches({
	theme: {
		space: { 1: '4px' },
		colors: { background: 'white' },
	},
})

const light = toNativeTokens(theme)

// Every token is a string or a number, and the scales and token names survive.
const space: string | number = light.space[1]
const background: string | number = light.colors.background
void space
void background

// @ts-expect-error a scale the theme does not define
void light.shadows

// @ts-expect-error a token the scale does not define
void light.space[2]

// An override is accepted as a second argument and does not change the shape.
const dark = toNativeTokens(theme, createTheme({ colors: { background: 'black' } }))
const darkBackground: string | number = dark.colors.background
void darkBackground

// @ts-expect-error className is not a scale, so it is not in the result
void light.className
