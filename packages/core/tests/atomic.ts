import { createStitches } from '../src/index.ts'

/** The atomic classes of a rendered class list, without the component's own marker classes. */
const atomsOf = (className: string): string[] => className.split(' ').filter((name) => name.startsWith('a-'))

/** The declaration each class of an element applies, by class, read from the sheet text. */
const declarationsOf = (cssText: string, className: string): string[] =>
	atomsOf(className).map((name) => {
		const match = new RegExp(`\\.${name}([^{]*)\\{([^}]*)\\}`).exec(cssText)
		if (!match) throw new Error(`no rule for ${name}`)
		return `${match[1]}${match[1] ? ' ' : ''}${match[2]}`
	})

/** The sheet without hydration markers and group wrappers: the rules in sheet order. */
const rulesOf = (cssText: string): string =>
	cssText
		.replace(/--sxs\{[^}]*\}/g, '')
		.replace(/@media\{/g, '')
		.replace(/\}\}(?=@|$)/g, '}')

describe('atomic output', () => {
	test('one class per declaration, shared by every style that writes it', () => {
		const { css, getCssText } = createStitches({ atomic: true, root: null })

		const first = css({ color: 'red', padding: 4 })()
		const second = css({ color: 'red', margin: 0 })()

		expect(atomsOf(first.className)).toHaveLength(2)
		expect(atomsOf(second.className)).toHaveLength(2)
		expect(atomsOf(first.className)[0]).toBe(atomsOf(second.className)[0])
		expect(getCssText().split('{color:red}')).toHaveLength(2)
	})

	test('an element gets only the winning declaration of each property', () => {
		const { css, getCssText } = createStitches({ atomic: true, root: null })

		const base = css({ color: 'black', variants: { tone: { muted: { color: 'gray' } } }, defaultVariants: { tone: 'muted' } })
		const extended = css(base, { color: 'red' })

		const baseClass = base().className
		const extendedClass = extended().className

		expect(declarationsOf(getCssText(), baseClass)).toEqual(['color:gray'])
		expect(declarationsOf(getCssText(), extendedClass)).toEqual(['color:red'])
	})

	test('a variant declared later wins, whatever renders first', () => {
		const component = (css: ReturnType<typeof createStitches>['css']) => css({ variants: { first: { on: { color: 'blue' } }, second: { on: { color: 'green' } } } })

		const forwards = createStitches({ atomic: true, root: null })
		const one = component(forwards.css)
		one({ first: 'on' })
		const forwardsClass = one({ first: 'on', second: 'on' }).className
		expect(declarationsOf(forwards.getCssText(), forwardsClass)).toEqual(['color:green'])

		// the same config hands back the same instance, reset to an empty sheet
		const backwards = createStitches({ atomic: true, root: null })
		const two = component(backwards.css)
		two({ second: 'on' })
		const backwardsClass = two({ first: 'on', second: 'on' }).className
		expect(declarationsOf(backwards.getCssText(), backwardsClass)).toEqual(['color:green'])
		expect(backwardsClass).toBe(forwardsClass)
	})

	test('the css prop is applied last of everything', () => {
		const { css, getCssText } = createStitches({ atomic: true, root: null })

		const { className } = css({ color: 'black', variants: { tone: { loud: { color: 'red' } } } })({ tone: 'loud', css: { color: 'purple' } })

		expect(declarationsOf(getCssText(), className)).toEqual(['color:purple'])
	})

	test('a later shorthand drops the longhands it resets; an earlier one sorts before them', () => {
		const { css, getCssText } = createStitches({ atomic: true, root: null })

		const reset = css({ paddingTop: 8, variants: { flat: { true: { padding: 0 } } } })({ flat: true })
		expect(declarationsOf(getCssText(), reset.className)).toEqual(['padding:0'])
		// dropped before it was ever written
		expect(getCssText()).not.toContain('{padding-top:8px}')

		// the longhand is written first here, and the shorthand still lands before it
		css({ paddingTop: 12 })()
		const refined = css({ padding: 4, variants: { tall: { true: { paddingTop: 12 } } } })({ tall: true })
		expect(declarationsOf(getCssText(), refined.className)).toEqual(['padding:4px', 'padding-top:12px'])

		const rules = rulesOf(getCssText())
		expect(rules.indexOf('{padding:4px}') < rules.indexOf('{padding-top:12px}')).toBe(true)
	})

	test('a later unconditional value drops earlier breakpoint values of the property, so the css prop always wins', () => {
		const { css, getCssText } = createStitches({ atomic: true, root: null, media: { md: '(min-width: 768px)' } })

		const { className } = css({ variants: { size: { l: { paddingLeft: 7 } } } })({ size: { '@md': 'l' }, css: { paddingLeft: 5 } })

		expect(declarationsOf(getCssText(), className)).toEqual(['padding-left:5px'])
	})

	test('a later longhand over an earlier breakpoint shorthand is restated under that breakpoint', () => {
		const { css, getCssText } = createStitches({ atomic: true, root: null, media: { md: '(min-width: 768px)' } })

		const base = css({ variants: { size: { l: { padding: 3 } } } })
		const { className } = css(base, { paddingTop: 1 })({ size: { '@md': 'l' } })

		// the shorthand still sets the other sides at md; the longhand applies everywhere and, at md,
		// is written again after the shorthand so it still wins there
		expect(declarationsOf(getCssText(), className)).toEqual(['padding:3px', 'padding-top:1px', 'padding-top:1px'])
		expect(getCssText()).toMatch(/@media \(min-width: 768px\)\{\.a-\w+\{padding:3px\}\}@media \(min-width: 768px\)\{\.a-\w+\{padding-top:1px\}\}/)
	})

	test('two different breakpoints declared against config.media order: the later breakpoint wins (the one documented difference)', () => {
		const { css, getCssText } = createStitches({ atomic: true, root: null, media: { md: '(min-width: 768px)', lg: '(min-width: 1200px)' } })

		// declared order says md's blue is later; atomic output keeps both and puts lg last
		const { className } = css({ '@lg': { color: 'green' }, 'variants': { tone: { on: { '@md': { color: 'blue' } } } } })({ tone: 'on' })

		expect(declarationsOf(getCssText(), className)).toEqual(['color:green', 'color:blue'])
		const rules = rulesOf(getCssText())
		expect(rules.indexOf('{color:blue}') < rules.indexOf('{color:green}')).toBe(true)
	})

	test('breakpoints follow unconditional rules, in config.media order', () => {
		const { css, getCssText } = createStitches({ atomic: true, root: null, media: { md: '(min-width: 768px)', lg: '(min-width: 1200px)' } })

		css({ '@lg': { color: 'green' } })()
		css({ '@md': { color: 'blue' } })()
		css({ color: 'red' })()

		const rules = rulesOf(getCssText())
		expect(rules.indexOf('{color:red}') < rules.indexOf('{color:blue}')).toBe(true)
		expect(rules.indexOf('{color:blue}') < rules.indexOf('{color:green}')).toBe(true)
	})

	test('pseudo-classes in a fixed order, whatever renders first', () => {
		const { css, getCssText } = createStitches({ atomic: true, root: null })

		css({ '&:active': { color: 'red' } })()
		css({ '&:focus-visible': { color: 'green' } })()
		css({ '&:hover': { color: 'blue' } })()

		const rules = rulesOf(getCssText())
		expect(rules.indexOf(':hover{') < rules.indexOf(':focus-visible{')).toBe(true)
		expect(rules.indexOf(':focus-visible{') < rules.indexOf(':active{')).toBe(true)
	})

	test('a component keeps its own class, so a selector naming it still works', () => {
		const { css, getCssText } = createStitches({ atomic: true, root: null })

		const icon = css({ width: 16 })
		const button = css({ [`${icon.selector} &`]: { color: 'red' } })

		expect(icon().className.split(' ')[0]).toBe(icon.className)
		button()
		expect(rulesOf(getCssText())).toContain(`.${icon.className} .a-`)
	})

	test('themes and global styles are written as before', () => {
		const { globalCss, getCssText } = createStitches({ atomic: true, root: null, theme: { colors: { text: 'black' } } })

		globalCss({ body: { margin: 0 } })()

		expect(getCssText()).toMatch(/^--sxs\{--sxs:0 t-\w+;--sxsk:0\}@media\{:root,\.t-\w+\{--colors-text:black\}\}--sxs\{--sxs:1 \w+;--sxsk:0\}@media\{body\{margin:0\}\}$/)
	})
})
