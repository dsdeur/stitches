import { createStitches } from '../../core/src/index.ts'
import { toNativeTokens } from '../src/index.ts'

describe('toNativeTokens', () => {
	test('lengths become numbers and everything else stays a string', () => {
		const { theme } = createStitches({
			theme: {
				space: { 1: '4px', 2: '8px' },
				radii: { small: '4px' },
				fontSizes: { 0: '11px' },
				lineHeights: { body: '1.6' },
				sizes: { half: '50%' },
				colors: { background: 'white', text: '#202124' },
				fonts: { mono: 'ui-monospace, Menlo, monospace' },
			},
		})

		expect(toNativeTokens(theme)).toEqual({
			space: { 1: 4, 2: 8 },
			radii: { small: 4 },
			fontSizes: { 0: 11 },
			lineHeights: { body: 1.6 },
			sizes: { half: '50%' },
			colors: { background: 'white', text: '#202124' },
			fonts: { mono: 'ui-monospace, Menlo, monospace' },
		})
	})

	test('a negative or fractional length is still a number', () => {
		const { theme } = createStitches({ theme: { space: { pull: '-2px', hairline: '0.5px' } } })

		expect(toNativeTokens(theme)).toEqual({ space: { pull: -2, hairline: 0.5 } })
	})

	test('the non-scale members of a theme are left out', () => {
		const { theme } = createStitches({ theme: { colors: { background: 'white' } } })

		expect(Object.keys(toNativeTokens(theme))).toEqual(['colors'])
	})

	test('a reference to another token in the same scale is resolved', () => {
		const { theme } = createStitches({
			theme: { shadows: { box: '0 1px 2px black', highlight: 'inset 0 0 0 1px #393fa9, $box' } },
		})

		expect(toNativeTokens(theme)).toEqual({
			shadows: { box: '0 1px 2px black', highlight: 'inset 0 0 0 1px #393fa9, 0 1px 2px black' },
		})
	})

	test('a reference across scales is resolved, and chains follow', () => {
		const { theme } = createStitches({
			theme: {
				colors: { shadow: 'rgba(0,0,0,.2)' },
				shadows: { box: '0 1px 2px $colors$shadow', highlight: 'inset 0 0 0 1px #393fa9, $box' },
			},
		})

		expect(toNativeTokens(theme)).toEqual({
			colors: { shadow: 'rgba(0,0,0,.2)' },
			shadows: {
				box: '0 1px 2px rgba(0,0,0,.2)',
				highlight: 'inset 0 0 0 1px #393fa9, 0 1px 2px rgba(0,0,0,.2)',
			},
		})
	})

	test('a resolved reference that leaves a bare length still becomes a number', () => {
		const { theme } = createStitches({ theme: { space: { base: '4px', same: '$base' } } })

		expect(toNativeTokens(theme)).toEqual({ space: { base: 4, same: 4 } })
	})

	test('a prefixed theme resolves its own references', () => {
		const { theme } = createStitches({
			prefix: 'hud',
			theme: { colors: { shadow: 'black' }, shadows: { box: '0 1px 2px $colors$shadow' } },
		})

		expect(toNativeTokens(theme)).toEqual({ colors: { shadow: 'black' }, shadows: { box: '0 1px 2px black' } })
	})

	test('a reference the theme does not define is left visible and never coerced', () => {
		const { theme } = createStitches({ theme: { space: { inset: 'var(--safe-area-inset-top)' } } })

		expect(toNativeTokens(theme)).toEqual({ space: { inset: 'var(--safe-area-inset-top)' } })
	})

	test('a var() fallback is used when the variable is unknown', () => {
		const { theme } = createStitches({ theme: { space: { inset: 'var(--safe-area-inset-top, 12px)' } } })

		expect(toNativeTokens(theme)).toEqual({ space: { inset: 12 } })
	})

	test('a cycle stops instead of looping', () => {
		const { theme } = createStitches({ theme: { colors: { a: '$b', b: '$a' } } })

		expect(toNativeTokens(theme)).toEqual({ colors: { a: 'var(--colors-a)', b: 'var(--colors-b)' } })
	})

	test('a later theme overrides an earlier one, and keeps what it does not mention', () => {
		const { theme, createTheme } = createStitches({
			theme: { colors: { background: 'white', text: 'black' }, space: { 1: '4px' } },
		})

		const dark = createTheme({ colors: { background: 'black' } })

		expect(toNativeTokens(theme, dark)).toEqual({
			colors: { background: 'black', text: 'black' },
			space: { 1: 4 },
		})
	})

	test('an override is what references resolve against', () => {
		const { theme, createTheme } = createStitches({
			theme: { colors: { shadow: 'rgba(0,0,0,.2)' }, shadows: { box: '0 1px 2px $colors$shadow' } },
		})

		const dark = createTheme({ colors: { shadow: 'rgba(255,255,255,.4)' } })

		expect(toNativeTokens(theme, dark)).toEqual({
			colors: { shadow: 'rgba(255,255,255,.4)' },
			shadows: { box: '0 1px 2px rgba(255,255,255,.4)' },
		})
	})

	test('the theme still renders css variables afterwards', () => {
		const { theme, css, getCssText } = createStitches({ theme: { space: { 1: '4px' } } })

		toNativeTokens(theme)

		const { className } = css({ padding: '$1' })()

		// Reading plain values must not disturb what the theme emits: the variable is still declared
		// and the rule still points at it, rather than at the 4 the native side got.
		expect(getCssText()).toBe(`--sxs{--sxs:0 ${theme.className}}@media{:root,${theme.selector}{--space-1:4px}}--sxs{--sxs:2 ${className}}@media{.${className}{padding:var(--space-1)}}`)
	})
})
