import { createStitches } from '../src/index.ts'

const media = { md: '(min-width: 768px)', lg: '(min-width: 1024px)' }

/** Sheet text without hydration markers, so positions can be compared. */
const rules = (getCssText: () => string) => getCssText().replace(/--sxs\{[^}]*\}/g, '')

const position = (cssText: string, needle: string) => {
	const index = cssText.indexOf(needle)
	if (index === -1) throw new Error(`missing rule: ${needle}`)
	return index
}

describe("cascade: 'declared'", () => {
	test('rule 1: an extension beats the variants of the component it extends, regardless of render order', () => {
		const { css, getCssText } = createStitches({ cascade: 'declared' })
		const A = css({ color: 'black', variants: { tone: { muted: { color: 'gray' } } }, defaultVariants: { tone: 'muted' } })
		const B = css(A, { color: 'red' })

		A()
		B()

		const cssText = rules(getCssText)
		expect(position(cssText, '{color:gray}') < position(cssText, '{color:red}')).toBe(true)
	})

	test("rule 1 in legacy mode is the other way around (the reason for 'declared')", () => {
		const { css, getCssText } = createStitches()
		const A = css({ color: 'black', variants: { tone: { muted: { color: 'gray' } } }, defaultVariants: { tone: 'muted' } })
		const B = css(A, { color: 'red' })

		A()
		B()

		const cssText = rules(getCssText)
		expect(position(cssText, '{color:red}') < position(cssText, '{color:gray}')).toBe(true)
	})

	test('rule 3: a variant declared later wins over one declared earlier, even if rendered first (upstream #1009)', () => {
		const { css, getCssText } = createStitches({ cascade: 'declared' })
		const Button = css({ variants: { variant: { primary: { color: 'blue' } }, isDisabled: { true: { color: 'gray' } } } })

		Button({ isDisabled: true })
		Button({ variant: 'primary', isDisabled: true })

		const cssText = rules(getCssText)
		expect(position(cssText, '{color:blue}') < position(cssText, '{color:gray}')).toBe(true)
	})

	test('rule 4: responsive rules follow the media order of the config, not render order (upstream #885)', () => {
		const { css, getCssText } = createStitches({ cascade: 'declared', media })
		const Stack = css({ variants: { gap: { 8: { gap: 8 }, 10: { gap: 10 }, 20: { gap: 20 } } } })

		Stack({ gap: { '@initial': 8, '@lg': 20 } })
		Stack({ gap: { '@initial': 8, '@md': 10, '@lg': 20 } })

		const cssText = rules(getCssText)
		expect(position(cssText, '@media (min-width: 768px)') < position(cssText, '@media (min-width: 1024px)')).toBe(true)
	})

	test('a style object reused at a deeper composition level wins there even if it was first rendered shallow (upstream #1039)', () => {
		const { css, getCssText } = createStitches({ cascade: 'declared' })
		const over = { color: 'red' }
		const A = css({ color: 'black' })
		const B = css(A, over)
		const C = css(over)

		C()
		B()

		const cssText = rules(getCssText)
		expect(cssText.lastIndexOf('{color:red}') > position(cssText, '{color:black}')).toBe(true)
	})

	test('the sheet text does not depend on the order in which components rendered', () => {
		const style = {
			padding: 4,
			variants: { size: { sm: { fontSize: 12 }, lg: { fontSize: 16 } }, tone: { a: { opacity: 0.5 }, b: { opacity: 1 } } },
			compoundVariants: [{ size: 'lg', tone: 'a', css: { fontWeight: 700 } }],
		}
		const renderInOrder = (order: 'forward' | 'reverse') => {
			const { css, getCssText } = createStitches({ cascade: 'declared', media })
			const X = css(style)
			const Y = css(X, { margin: 2, variants: { edge: { on: { border: '1px solid' } } } })
			const renders = [
				() => X({ size: 'sm' }),
				() => X({ tone: 'b' }),
				() => Y({ size: { '@initial': 'sm', '@lg': 'lg' }, tone: 'a', edge: 'on' }),
				() => X({ size: { '@md': 'lg' }, tone: 'a' }),
				() => Y({ css: { color: 'red' } }),
			]
			for (const render of order === 'forward' ? renders : renders.reverse()) render()
			return getCssText()
		}

		// markers list cache entries in render order by design; the rules themselves must not depend on it
		const strip = (cssText: string) => cssText.replace(/--sxs\{[^}]*\}/g, '')
		expect(strip(renderInOrder('forward'))).toBe(strip(renderInOrder('reverse')))
	})

	test('composition deeper than the group limit still works and lands in the last depth group', () => {
		const { css, getCssText } = createStitches({ cascade: 'declared' })
		let component = css({ margin: 0 })
		for (let depth = 1; depth <= 9; depth++) component = css(component, { margin: depth })

		component()

		const cssText = rules(getCssText)
		expect(position(cssText, '{margin:8px}') < position(cssText, '{margin:9px}')).toBe(true)
	})

	test('markers carry the rule sort keys so a hydrating client can keep positioning', () => {
		const { css, getCssText } = createStitches({ cascade: 'declared', media })
		const X = css({ variants: { size: { sm: { fontSize: 12 }, lg: { fontSize: 16 } } } })

		X({ size: 'lg' })
		X({ size: { '@md': 'sm' } })

		const cssText = getCssText()
		// both rules share the depth-0 variants group; keys are (declaration, breakpoint, value) encoded as one number
		expect(/--sxs\{--sxs:\d+ c-PJLV-\w+-size-lg c-PJLV-\w+-size-sm;--sxsk:1 10000\}/.test(cssText)).toBe(true)
	})

	test('legacy markers are unchanged', () => {
		const { css, getCssText } = createStitches()
		css({ variants: { size: { lg: { fontSize: 16 } } } })({ size: 'lg' })

		expect(getCssText().includes('--sxsk')).toBe(false)
	})
})

describe("cascade: 'declared' follows source order, media queries grant no priority", () => {
	test('a later-declared variant beats an earlier one even when the earlier one applies at a wider breakpoint', () => {
		const { css, getCssText } = createStitches({ cascade: 'declared', media })
		const Box = css({ variants: { first: { on: { color: 'red' } }, second: { on: { color: 'blue' } } } })

		Box({ first: { '@lg': 'on' }, second: { '@md': 'on' } })

		const cssText = rules(getCssText)
		// first@lg is declared first, so it comes first; second@md wins wherever both apply
		expect(position(cssText, '{color:red}') < position(cssText, '{color:blue}')).toBe(true)
	})

	test('a later-declared plain variant beats an earlier responsive one', () => {
		const { css, getCssText } = createStitches({ cascade: 'declared', media })
		const Box = css({ variants: { first: { on: { color: 'red' } }, second: { on: { color: 'blue' } } } })

		Box({ first: { '@md': 'on' }, second: 'on' })

		const cssText = rules(getCssText)
		expect(position(cssText, '{color:red}') < position(cssText, '{color:blue}')).toBe(true)
	})

	test('breakpoint order within one variant is the config order, so desktop-first max-width configs work the same', () => {
		const desktopFirst = { desktop: '(max-width: 1200px)', tablet: '(max-width: 900px)', phone: '(max-width: 600px)' }
		const { css, getCssText } = createStitches({ cascade: 'declared', media: desktopFirst })
		const Text = css({ variants: { size: { s: { fontSize: 12 }, m: { fontSize: 14 }, l: { fontSize: 16 } } } })

		Text({ size: { '@phone': 's' } })
		Text({ size: { '@desktop': 'l', '@tablet': 'm' } })

		const cssText = rules(getCssText)
		expect(position(cssText, '(max-width: 1200px)') < position(cssText, '(max-width: 900px)')).toBe(true)
		expect(position(cssText, '(max-width: 900px)') < position(cssText, '(max-width: 600px)')).toBe(true)
	})
})

describe("cascade: 'declared' treats a variant name as one declaration across composition depths", () => {
	test('a responsive value from the base component still beats a default added by the extension (issue-450 pattern)', () => {
		const { css, getCssText } = createStitches({ cascade: 'declared', media })
		const Base = css({ variants: { color: { red: { color: 'red' }, blue: { color: 'blue' } } }, defaultVariants: { color: 'red' } })
		const Extended = css(Base, { variants: { color: { orange: { color: 'orange' } } }, defaultVariants: { color: 'orange' } })

		Extended({ color: { '@md': 'blue' } })

		const cssText = rules(getCssText)
		// default orange applies below md; blue must come later so it wins from md up
		expect(position(cssText, '{color:orange}') < position(cssText, '@media (min-width: 768px)')).toBe(true)
	})

	test('values an extension adds to an inherited variant sort after the inherited values', () => {
		const { css, getCssText } = createStitches({ cascade: 'declared' })
		const Base = css({ variants: { size: { sm: { fontSize: 12 } } } })
		const Extended = css(Base, { variants: { size: { xl: { fontSize: 24 } } } })

		Extended({ size: 'xl' })
		Extended({ size: 'sm' })

		const cssText = rules(getCssText)
		expect(position(cssText, '{font-size:12px}') < position(cssText, '{font-size:24px}')).toBe(true)
	})
})
