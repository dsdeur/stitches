import { createStitches } from '../src/index.ts'

describe('Composite tokens: one token holding a whole border value', () => {
	const theme = {
		colors: { gray: '#888', blue: 'dodgerblue' },
		borderWidths: { thin: '1px' },
		borders: { default: '1px solid $colors$gray', focus: '$borderWidths$thin solid $colors$blue' },
	}

	test('a bare token on a border shorthand resolves from the borders scale, with no themeMap config', () => {
		const { css, toString } = createStitches({ theme })

		css({ border: '$default', borderTop: '$focus', outline: '$default' })()

		const cssText = toString()

		expect(cssText.includes('border:var(--borders-default)')).toBe(true)
		expect(cssText.includes('border-top:var(--borders-focus)')).toBe(true)
		expect(cssText.includes('outline:var(--borders-default)')).toBe(true)
	})

	test('the token value itself resolves nested tokens at theme creation', () => {
		const { toString, theme: defaultTheme } = createStitches({ theme })

		String(defaultTheme)

		const cssText = toString()

		expect(cssText.includes('--borders-default:1px solid var(--colors-gray)')).toBe(true)
		expect(cssText.includes('--borders-focus:var(--borderWidths-thin) solid var(--colors-blue)')).toBe(true)
	})

	test('a color token on a border shorthand still resolves from colors, so existing styles keep working', () => {
		const { css, toString } = createStitches({ theme })

		css({ border: '1px solid $gray', borderLeft: '$blue', color: '$gray' })()

		const cssText = toString()

		expect(cssText.includes('border:1px solid var(--colors-gray)')).toBe(true)
		expect(cssText.includes('border-left:var(--colors-blue)')).toBe(true)
		expect(cssText.includes('color:var(--colors-gray)')).toBe(true)
	})

	test('with no borders scale at all, border tokens resolve from colors exactly as before', () => {
		const { css, toString } = createStitches({ theme: { colors: { gray: '#888' } } })

		css({ border: '$gray', borderTop: '1px solid $gray' })()

		const cssText = toString()

		expect(cssText.includes('border:var(--colors-gray)')).toBe(true)
		expect(cssText.includes('border-top:1px solid var(--colors-gray)')).toBe(true)
	})

	test('the scale-qualified form keeps working and wins over the property mapping', () => {
		const { css, toString } = createStitches({ theme })

		css({ border: '$borders$focus', color: '$colors$blue' })()

		const cssText = toString()

		expect(cssText.includes('border:var(--borders-focus)')).toBe(true)
		expect(cssText.includes('color:var(--colors-blue)')).toBe(true)
	})

	test('a token defined in both scales takes the first scale the property names', () => {
		const { css, toString } = createStitches({ theme: { colors: { brand: 'red' }, borders: { brand: '2px dashed red' } } })

		css({ border: '$brand', color: '$brand' })()

		const cssText = toString()

		expect(cssText.includes('border:var(--borders-brand)')).toBe(true)
		expect(cssText.includes('color:var(--colors-brand)')).toBe(true)
	})

	test('an explicit themeMap can still name a single scale per property', () => {
		const { css, toString } = createStitches({ theme, themeMap: { border: 'borders' } })

		css({ border: '$default' })()

		expect(toString().includes('border:var(--borders-default)')).toBe(true)
	})
})
