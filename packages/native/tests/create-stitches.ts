import { createStitches } from '../src/index.ts'

describe('createStitches for React Native', () => {
	const config = {
		theme: {
			colors: { background: 'white', text: '#0c0c11', shadow: 'rgba(0,0,0,.2)' },
			space: { 1: '4px', 2: '8px' },
			radii: { default: '6px' },
			fontSizes: { 3: '14px' },
			shadows: { box: '0 1px 2px $colors$shadow' },
		},
	}

	test('a bare token resolves against the scale the property maps to', () => {
		const { css } = createStitches(config)

		expect(css({ padding: '$1', color: '$text', borderRadius: '$default', fontSize: '$3' })()).toEqual({
			padding: 4,
			color: '#0c0c11',
			borderRadius: 6,
			fontSize: 14,
		})
	})

	test('a token names its scale explicitly when the property does not imply one', () => {
		const { css } = createStitches(config)

		expect(css({ shadowColor: '$colors$shadow', opacity: 1 })()).toEqual({ shadowColor: 'rgba(0,0,0,.2)', opacity: 1 })
	})

	test('a reference in the theme itself is resolved', () => {
		const { css } = createStitches(config)

		expect(css({ boxShadow: '$box' })()).toEqual({ boxShadow: '0 1px 2px rgba(0,0,0,.2)' })
	})

	test('a property with no scale keeps a bare token as written, rather than guessing', () => {
		const { css } = createStitches(config)

		expect(css({ transformOrigin: '$1' })()).toEqual({ transformOrigin: '$1' })
	})

	test('lengths become numbers and percentages stay strings', () => {
		const { css } = createStitches()

		expect(css({ padding: '12px', width: '50%', flex: 1, position: 'absolute' })()).toEqual({
			padding: 12,
			width: '50%',
			flex: 1,
			position: 'absolute',
		})
	})

	test('what React Native takes as an object or an array is passed through', () => {
		const { css } = createStitches()

		const style = css({ shadowOffset: { width: 0, height: 1 }, transform: [{ translateX: 4 }] })()

		expect(style).toEqual({ shadowOffset: { width: 0, height: 1 }, transform: [{ translateX: 4 }] })
	})

	describe('variants', () => {
		const { css } = createStitches(config)

		// The default tone is `quiet`, so the compound below only comes into play when a test asks
		// for `brand`. Every other test then reads as one rule at a time.
		const button = css({
			padding: '$1',
			variants: {
				size: { large: { padding: '$2' } },
				tone: { brand: { color: '$text' }, quiet: { color: 'gray' } },
				disabled: { true: { opacity: 0.5 } },
			},
			compoundVariants: [{ size: 'large', tone: 'brand', css: { padding: '$1' } }],
			defaultVariants: { tone: 'quiet' },
		})

		test('a selected variant beats the base style', () => {
			expect(button({ size: 'large' })).toEqual({ padding: 8, color: 'gray' })
		})

		test('a default variant applies with no prop passed', () => {
			expect(button()).toEqual({ padding: 4, color: 'gray' })
		})

		test('a passed variant beats the default', () => {
			expect(button({ tone: 'brand' })).toEqual({ padding: 4, color: '#0c0c11' })
		})

		test('a boolean variant selects the true key', () => {
			expect(button({ disabled: true })).toEqual({ padding: 4, color: 'gray', opacity: 0.5 })
		})

		test('a compound variant is applied after every plain variant', () => {
			// size sets padding 8 and tone sets the brand colour; the compound puts padding back to 4.
			expect(button({ size: 'large', tone: 'brand' })).toEqual({ padding: 4, color: '#0c0c11' })
		})

		test('a compound variant matches a default the caller never passed', () => {
			const quiet = css({
				variants: { size: { large: { padding: '$2' } }, tone: { quiet: { color: 'gray' } } },
				compoundVariants: [{ size: 'large', tone: 'quiet', css: { borderWidth: '2px' } }],
				defaultVariants: { tone: 'quiet' },
			})

			expect(quiet({ size: 'large' })).toEqual({ padding: 8, color: 'gray', borderWidth: 2 })
		})

		test('a variant declared later wins over one declared earlier', () => {
			const later = css({
				variants: {
					first: { on: { color: 'blue' } },
					second: { on: { color: 'green' } },
				},
			})

			expect(later({ first: 'on', second: 'on' })).toEqual({ color: 'green' })
		})
	})

	describe('composition', () => {
		const { css } = createStitches(config)

		test('a later composer beats an earlier one, its variants included', () => {
			const base = css({ variants: { tone: { brand: { color: 'blue' } } } })
			const extended = css(base, { color: 'red' })

			expect(extended({ tone: 'brand' })).toEqual({ color: 'red' })
		})

		test('an extension inherits the variants it does not redefine', () => {
			const base = css({ padding: '$1', variants: { size: { large: { padding: '$2' } } } })
			const extended = css(base, { color: 'red' })

			expect(extended({ size: 'large' })).toEqual({ padding: 8, color: 'red' })
		})

		test('the css prop is applied last of everything', () => {
			const base = css({ color: 'blue', variants: { tone: { loud: { color: 'green' } } } })

			expect(base({ tone: 'loud', css: { color: 'purple' } })).toEqual({ color: 'purple' })
		})
	})

	describe('themes', () => {
		test('createTheme resolves over the default theme and keeps what it does not mention', () => {
			const { css, createTheme } = createStitches(config)

			const dark = createTheme({ colors: { background: 'black' } })

			expect(css({ backgroundColor: '$background', color: '$text' })({}, dark)).toEqual({
				backgroundColor: 'black',
				color: '#0c0c11',
			})
		})

		test('a theme reference resolves against the override, not the default', () => {
			const { css, createTheme } = createStitches(config)

			const dark = createTheme({ colors: { shadow: 'rgba(255,255,255,.4)' } })

			expect(css({ boxShadow: '$box' })({}, dark)).toEqual({ boxShadow: '0 1px 2px rgba(255,255,255,.4)' })
		})

		test('the default theme is exposed as plain values', () => {
			const { theme } = createStitches(config)

			expect(theme).toEqual({
				colors: { background: 'white', text: '#0c0c11', shadow: 'rgba(0,0,0,.2)' },
				space: { 1: 4, 2: 8 },
				radii: { default: 6 },
				fontSizes: { 3: 14 },
				shadows: { box: '0 1px 2px rgba(0,0,0,.2)' },
			})
		})
	})

	test('the same selection returns the same object, so React Native can compare by identity', () => {
		const { css } = createStitches(config)

		const style = css({ padding: '$1', variants: { size: { large: { padding: '$2' } } } })

		expect(style({ size: 'large' })).toBe(style({ size: 'large' }))
		expect(style({ size: 'large' })).not.toBe(style())
	})

	test('a themeMap entry can be added or overridden by the config', () => {
		const { css } = createStitches({ theme: { space: { 1: '4px' } }, themeMap: { gapSpacing: 'space' } })

		expect(css({ gapSpacing: '$1' })()).toEqual({ gapSpacing: 4 })
	})
})
