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
		expect(/--sxs\{--sxs:\d+ c-PJLV-\w+-size-lg;--sxsk:1\}/.test(cssText)).toBe(true)
		expect(/--sxs\{--sxs:\d+ c-PJLV-\w+-size-sm;--sxsk:10000\}/.test(cssText)).toBe(true)
	})

	test('legacy markers are unchanged', () => {
		const { css, getCssText } = createStitches()
		css({ variants: { size: { lg: { fontSize: 16 } } } })({ size: 'lg' })

		expect(getCssText().includes('--sxsk')).toBe(false)
	})
})
