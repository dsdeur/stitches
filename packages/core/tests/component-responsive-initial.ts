import { createStitches } from '../src/index.ts'

describe('Responsive variants whose @initial value repeats at a breakpoint', () => {
	const media = { small: '(min-width: 100px)', medium: '(min-width: 200px)' }

	test('the @initial value is applied even when a later breakpoint uses the same value (upstream #1146)', () => {
		const { css, getCssText } = createStitches({ media })
		const component = css({ variants: { color: { red: { color: 'red' }, blue: { color: 'blue' } } } })

		const { className } = component({ color: { '@initial': 'red', '@small': 'blue', '@medium': 'red' } })

		expect(className.includes('c-PJLV-gmqXFB-color-red')).toBe(true)

		const cssText = getCssText()

		expect(cssText.includes('--sxs{--sxs:3 c-PJLV-gmqXFB-color-red}@media{.c-PJLV-gmqXFB-color-red{color:red}}')).toBe(true)
		expect(cssText.includes('@media (min-width: 100px){.c-PJLV-gqOcjT-color-blue{color:blue}}')).toBe(true)
		expect(cssText.includes('@media (min-width: 200px){.c-PJLV-lifraF-color-red{color:red}}')).toBe(true)
	})

	test('the same value at @initial and a breakpoint applies at both (upstream #896)', () => {
		const { css, getCssText } = createStitches({ media })
		const component = css({ variants: { mode: { light: { background: 'white' } } } })

		component({ mode: { '@initial': 'light', '@small': 'light' } })

		const cssText = getCssText()

		expect(/--sxs\{--sxs:3 c-PJLV-\w+-mode-light\}@media\{\.c-PJLV-\w+-mode-light\{background:white\}\}/.test(cssText)).toBe(true)
		expect(/@media \(min-width: 100px\)\{\.c-PJLV-\w+-mode-light\{background:white\}\}/.test(cssText)).toBe(true)
	})

	test('a breakpoint value that differs from @initial does not get an unwrapped rule', () => {
		const { css, getCssText } = createStitches({ media })
		const component = css({ variants: { color: { red: { color: 'red' }, blue: { color: 'blue' } } } })

		component({ color: { '@initial': 'blue', '@small': 'red' } })

		const cssText = getCssText()

		// the bare blue rule sits in the non-responsive group (--sxs:3); no red rule may appear there
		expect(/--sxs\{--sxs:3 c-PJLV-\w+-color-blue\}@media\{\.c-PJLV-\w+-color-blue\{color:blue\}\}/.test(cssText)).toBe(true)
		expect(/--sxs\{--sxs:3 [^}]*color-red/.test(cssText)).toBe(false)
		expect(/@media \(min-width: 100px\)\{\.c-PJLV-\w+-color-red\{color:red\}\}/.test(cssText)).toBe(true)
	})
})
