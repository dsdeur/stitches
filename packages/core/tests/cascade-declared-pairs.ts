import { createStitches } from '../src/index.ts'

/**
 * One test per behavioral entry in declared-run/allowlist.json. Each expectation is derived from
 * the ordering rule (roadmap section 11.1), not copied from output: the old test states what
 * legacy does, this file states what 'declared' must do, and the allowlist links the two.
 */

const rules = (getCssText: () => string) => getCssText().replace(/--sxs\{[^}]*\}/g, '')

const position = (cssText: string, needle: string) => {
	const index = cssText.indexOf(needle)
	if (index === -1) throw new Error(`missing rule: ${needle}`)
	return index
}

describe("allowlisted differences, asserted from the rule for cascade: 'declared'", () => {
	test('component-variants: variants emit in declaration order, not render order', () => {
		const { css, getCssText } = createStitches({ cascade: 'declared' })
		// `color` is declared before `size`
		const component = css({ variants: { color: { blue: { color: 'white' } }, size: { small: { fontSize: 16 } } } })

		// rendered the other way around
		component({ size: 'small' })
		component({ color: 'blue' })

		const cssText = rules(getCssText)
		expect(position(cssText, '{color:white}') < position(cssText, '{font-size:16px}')).toBe(true)
	})

	test('component-variants: raw media queries fall back to value declaration order', () => {
		const { css, getCssText } = createStitches({ cascade: 'declared' })
		// `large` is declared before `small`; neither query is a config key
		const component = css({ variants: { size: { large: { fontSize: 24 }, small: { fontSize: 16 } } } })

		component({ size: { '@media (width < 768px)': 'small', '@media (width >= 768px)': 'large' } })

		const cssText = rules(getCssText)
		expect(position(cssText, '{font-size:24px}') < position(cssText, '{font-size:16px}')).toBe(true)
	})

	test("issue-450: an extension's base rule comes after the parent's variant and compound rules", () => {
		const { css, getCssText } = createStitches({ cascade: 'declared' })
		const parent = css({
			'--component': 1,
			variants: { appearance: { primary: {}, secondary: { '--appearance': 'secondary' } }, color: { red: {}, lightBlue: { '--color': 'lightBlue' } } },
			compoundVariants: [{ appearance: 'secondary', color: 'lightBlue', css: { '--compound': 'yes' } }],
			defaultVariants: { appearance: 'primary', color: 'red' },
		})
		const extension = css(parent, { '--component': 2, defaultVariants: { appearance: 'secondary', color: 'lightBlue' } })

		extension()

		const cssText = rules(getCssText)
		// rule 1: depth first. The extension's base is at depth 1, the parent's variants and compound at depth 0.
		expect(position(cssText, '{--appearance:secondary}') < position(cssText, '{--component:2}')).toBe(true)
		expect(position(cssText, '{--compound:yes}') < position(cssText, '{--component:2}')).toBe(true)
	})

	test('issue-492: values of one variant at one breakpoint emit in declaration order', () => {
		const { css, getCssText } = createStitches({ cascade: 'declared', media: { bp1: '(min-width: 640px)' } })
		// `caroline` is declared before `dreams`
		const component = css({ variants: { sweet: { caroline: { '--sweet': 'caroline' }, dreams: { '--sweet': 'dreams' } } } })

		// rendered the other way around, both at the same breakpoint
		component({ sweet: { '@bp1': 'dreams' } })
		component({ sweet: { '@bp1': 'caroline' } })

		const cssText = rules(getCssText)
		expect(position(cssText, '{--sweet:caroline}') < position(cssText, '{--sweet:dreams}')).toBe(true)
	})

	test('issue-725: variants in declaration order, breakpoints of one variant in config order', () => {
		const { css, getCssText } = createStitches({ cascade: 'declared', media: { bp1: '(min-width: 420px)', bp2: '(min-width: 720px)', bp3: '(min-width: 1536px)' } })
		// `justify` is declared before `color`
		const component = css({
			variants: { justify: { start: { justifyContent: 'flex-start' }, end: { justifyContent: 'flex-end' } }, color: { red: { color: 'red' } } },
		})

		// render color first, and the wider breakpoint before the narrower one
		component({ color: 'red' })
		component({ justify: { '@bp2': 'end', '@bp3': 'end' } })
		component({ justify: { '@bp1': 'start' } })

		const cssText = rules(getCssText)
		// rule 3: justify (declared first) before color
		expect(position(cssText, '{justify-content:flex-end}') < position(cssText, '{color:red}')).toBe(true)
		// rule 4: within justify, bp1 before bp2/bp3
		expect(position(cssText, '{justify-content:flex-start}') < position(cssText, '{justify-content:flex-end}')).toBe(true)
	})

	test('issue-725: a variant declared earlier emits first even at a narrower breakpoint', () => {
		const { css, getCssText } = createStitches({ cascade: 'declared', media: { bp2: '(min-width: 720px)', bp3: '(min-width: 1536px)' } })
		// `variant` is declared before `disabled`
		const component = css({ variants: { variant: { red: { backgroundColor: 'tomato' } }, disabled: { true: { backgroundColor: 'gray' } } } })

		// disabled applies at the wider breakpoint and is rendered first
		component({ disabled: { '@bp3': true } })
		component({ variant: { '@bp2': 'red' } })

		const cssText = rules(getCssText)
		expect(position(cssText, '{background-color:tomato}') < position(cssText, '{background-color:gray}')).toBe(true)
	})
})
