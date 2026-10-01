import { createStitches } from '../src/index.ts'

describe('Polyfill prefixed values', () => {
	test('width:stretch', () => {
		const { globalCss, toString } = createStitches()

		globalCss({
			'.gro': {
				width: 'stretch',
			},
		})()

		expect(toString()).toBe(`--sxs{--sxs:1 coIeei}@media{.gro{width:-moz-available;width:-webkit-fill-available}}`)
	})

	test('width:fit-content', () => {
		const { globalCss, toString } = createStitches()

		globalCss({
			'.fit': {
				width: 'fit-content',
			},
		})()

		expect(toString()).toBe(`--sxs{--sxs:1 gZsLvv}@media{.fit{width:-moz-fit-content;width:fit-content}}`)
	})

	test('logical shorthands expand to their start and end longhands', () => {
		const { css, getCssText } = createStitches({ root: null })

		css({ maxSize: '10px 20px', minSize: '5px', marginInline: '1px 2px', paddingBlock: '3px' })()

		expect(getCssText()).toContain('{max-block-size:10px;max-inline-size:20px;min-block-size:5px;min-inline-size:5px;margin-inline-start:1px;margin-inline-end:2px;padding-block-start:3px;padding-block-end:3px}')
	})

	test('content values are quoted unless they already are, or are a keyword or a function', () => {
		const { css, getCssText } = createStitches({ root: null })

		css({ '&::before': { content: 'hi' }, '&::after': { content: 'attr(title)' }, '& span::before': { content: 'none' } })()

		expect(getCssText()).toContain('::before{content:"hi"}')
		expect(getCssText()).toContain('::after{content:attr(title)}')
		expect(getCssText()).toContain(' span::before{content:none}')
	})
})
