import * as React from 'react'
import * as renderer from 'react-test-renderer'
import { createStitches } from '../src/index.ts'
import { createStitches as createReactStitches } from '../src/react/index.ts'

/** The message a call throws, or '' if it does not. */
const errorOf = (call: () => unknown): string => {
	try {
		call()
		return ''
	} catch (error) {
		return error instanceof Error ? error.message : String(error)
	}
}

/** A stand-in for iOS's DynamicColorIOS: an opaque object carrying both colors. */
const DynamicColorIOS = (colors: { readonly light: string; readonly dark: string }) => ({ dynamic: colors })

describe('dynamicTheme', () => {
	const config = {
		theme: {
			colors: { text: 'black', background: 'white', accent: 'blue' },
			space: { 1: '4px' },
		},
	}

	test('colors that differ become platform colors; equal ones stay plain', () => {
		const { createTheme, dynamicTheme } = createStitches(config)
		const dark = createTheme({ colors: { text: 'white', background: 'black' } })

		const both = dynamicTheme(dark, DynamicColorIOS)

		expect(both.colors).toEqual({ text: { dynamic: { light: 'black', dark: 'white' } }, background: { dynamic: { light: 'white', dark: 'black' } }, accent: 'blue' })
		expect(both.space).toEqual({ 1: 4 })
	})

	test('a token used as a whole value reaches the style as the platform color itself', () => {
		const { css, createTheme, dynamicTheme } = createStitches(config)
		const both = dynamicTheme(createTheme({ colors: { text: 'white' } }), DynamicColorIOS)
		const style = css({ color: '$text', borderColor: '$colors$text', backgroundColor: '$accent' })

		const resolved = style({}, both)

		expect(resolved).toEqual({ color: { dynamic: { light: 'black', dark: 'white' } }, borderColor: { dynamic: { light: 'black', dark: 'white' } }, backgroundColor: 'blue' })
		expect(resolved.color).toBe(both.colors.text)
		// cached per theme like any other: the same object every time
		expect(style({}, both)).toBe(resolved)
	})

	test('a platform color inside a longer string is left as a visible reference, not "[object Object]"', () => {
		const { css, createTheme, dynamicTheme } = createStitches(config)
		const both = dynamicTheme(createTheme({ colors: { text: 'white' } }), DynamicColorIOS)

		expect(css({ textShadow: '0 1px 2px $colors$text' })({}, both)).toEqual({ textShadow: '0 1px 2px $colors$text' })
	})

	test('anything but a color that differs throws, naming it', () => {
		const { createTheme, dynamicTheme } = createStitches({ theme: { ...config.theme, shadows: { card: '0 1px $colors$text' } } })
		const dark = createTheme({ colors: { text: 'white' } })

		expect(errorOf(() => dynamicTheme(dark, DynamicColorIOS))).toMatch(/shadows\.card is "0 1px black" in light and "0 1px white" in dark/)
		expect(errorOf(() => dynamicTheme(createTheme({ space: { 1: '8px' } }), DynamicColorIOS))).toMatch(/space\.1/)
	})

	test('the color scales and the light theme can be named', () => {
		const { createTheme, dynamicTheme } = createStitches({ theme: { colors: { text: 'black' }, brand: { main: 'red' } } })
		const light = createTheme({ colors: { text: 'gray' } })
		const dark = createTheme({ colors: { text: 'white' }, brand: { main: 'pink' } })

		const both = dynamicTheme(dark, DynamicColorIOS, { light, scales: ['colors', 'brand'] })

		expect(both.colors.text).toEqual({ dynamic: { light: 'gray', dark: 'white' } })
		expect(both.brand.main).toEqual({ dynamic: { light: 'red', dark: 'pink' } })
	})

	test('through the Provider, styled components get platform colors and need no re-render to switch', () => {
		const { styled, Provider, createTheme, dynamicTheme } = createReactStitches(config)
		const both = dynamicTheme(createTheme({ colors: { text: 'white' } }), DynamicColorIOS)
		const Label = styled((props: { style?: unknown }) => React.createElement('Text', props), { color: '$text' })

		let tree: renderer.ReactTestRenderer | undefined
		renderer.act(() => {
			tree = renderer.create(React.createElement(Provider, { theme: both }, React.createElement(Label)))
		})

		expect(tree?.toJSON()).toEqual(expect.objectContaining({ props: { style: { color: { dynamic: { light: 'black', dark: 'white' } } } } }))
	})
})
