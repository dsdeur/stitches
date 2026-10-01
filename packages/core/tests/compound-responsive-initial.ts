import { createStitches } from '../src/index.ts'

// Found by the randomized differential check (docs/bench/browser-differential.mts): a compound
// variant whose condition holds at @initial and again at a breakpoint was wrapped in that
// breakpoint, so it applied only there, although the condition holds at every width.
describe('compound variants and a condition that also matched at @initial', () => {
	const media = { md: '(min-width: 768px)', lg: '(min-width: 1200px)' }

	test('a condition that holds everywhere adds no breakpoint of its own', () => {
		const { css, getCssText } = createStitches({ media, root: null })

		const component = css({
			variants: { tone: { brand: { color: 'blue' } }, size: { large: { fontSize: 16 } } },
			compoundVariants: [{ tone: 'brand', size: 'large', css: { fontWeight: 700 } }],
		})

		// tone is brand at every width (and again at lg); size is large from md up
		component({ tone: { '@initial': 'brand', '@lg': 'brand' }, size: { '@md': 'large' } })

		const compound = /([^{}]*\{)*[^{}]*\{font-weight:700\}/.exec(getCssText())?.[0] ?? ''
		expect(compound).toContain('@media (min-width: 768px)')
		expect(compound).not.toContain('@media (min-width: 1200px)')
	})

	test('a compound whose every condition holds at @initial is written once, unwrapped', () => {
		const { css, getCssText } = createStitches({ media, root: null })

		const component = css({
			variants: { tone: { brand: { color: 'blue' } }, size: { large: { fontSize: 16 } } },
			compoundVariants: [{ tone: 'brand', size: 'large', css: { fontWeight: 700 } }],
		})

		component({ tone: { '@initial': 'brand', '@lg': 'brand' }, size: 'large' })

		expect(getCssText().split('{font-weight:700}')).toHaveLength(2)
		expect(getCssText()).toMatch(/\}\.c-\w+-\w+-cv\{font-weight:700\}|@media\{\.c-\w+-\w+-cv\{font-weight:700\}/)
	})
})
