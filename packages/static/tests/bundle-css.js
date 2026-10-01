// Plain JS, like extract-css.js beside it: the instances are built from core's source.
import { createStitches } from '../../core/src/index.ts'
import { bundleCss, extractCss, toPlainCss, utilityClasses, utilityCss } from '../src/index.ts'

const config = {
	media: { tablet: '(min-width: 768px)', desktop: '(min-width: 1200px)' },
	theme: {
		colors: { primary: 'blue', text: 'black' },
		space: { 1: '4px', 2: '8px' },
		borders: { default: '1px solid $colors$text' },
	},
}

describe('toPlainCss', () => {
	test('drops the markers and the unconditional groups, and keeps every rule in order', () => {
		expect(toPlainCss('--sxs{--sxs:2 c-a;--sxsk:0}@media{.c-a{color:red}.c-b{color:blue}}--sxs{--sxs:3 c-a-x}@media{@media (min-width: 1px){.c-a-x{color:green}}}')).toBe(
			'.c-a{color:red}.c-b{color:blue}@media (min-width: 1px){.c-a-x{color:green}}',
		)
	})

	test('a brace inside a quoted value does not end a group', () => {
		expect(toPlainCss(`--sxs{--sxs:2 c-a}@media{.c-a::before{content:"}{"}.c-b::after{content:'\\'}'}}`)).toBe(`.c-a::before{content:"}{"}.c-b::after{content:'\\'}'}`)
	})

	test('keeps imports, which precede every group', () => {
		expect(toPlainCss('@import "x.css";--sxs{--sxs:1 g}@media{body{margin:0}}')).toBe('@import "x.css";body{margin:0}')
	})
})

describe('utility classes', () => {
	test('one class per token of the scale each property maps to, valued by the token variable', () => {
		const stitches = createStitches({ ...config, root: null })
		const classes = utilityClasses(stitches, { properties: ['padding', 'backgroundColor'], responsive: false })

		expect(classes).toEqual([
			{ className: 'padding-1', property: 'padding', value: 'var(--space-1)' },
			{ className: 'padding-2', property: 'padding', value: 'var(--space-2)' },
			{ className: 'background-color-primary', property: 'background-color', value: 'var(--colors-primary)' },
			{ className: 'background-color-text', property: 'background-color', value: 'var(--colors-text)' },
		])
	})

	test('a property mapped to several scales gets the tokens of each, the first scale winning a shared name', () => {
		const stitches = createStitches({ ...config, theme: { ...config.theme, colors: { ...config.theme.colors, default: 'gray' } }, root: null })
		const classes = utilityClasses(stitches, { properties: ['border'], responsive: false })

		expect(classes.map(({ className, value }) => `${className} ${value}`)).toEqual(['border-default var(--borders-default)', 'border-primary var(--colors-primary)', 'border-text var(--colors-text)'])
	})

	test('breakpoints and states are prefixes, the config prefix sits on the utility name', () => {
		const stitches = createStitches({ ...config, prefix: 'ui', root: null })
		const names = utilityClasses(stitches, { properties: ['color'], states: ['hover'] }).map(({ className }) => className)

		expect(names).toEqual([
			'ui-color-primary',
			'ui-color-text',
			'hover:ui-color-primary',
			'hover:ui-color-text',
			'tablet:ui-color-primary',
			'tablet:ui-color-text',
			'tablet:hover:ui-color-primary',
			'tablet:hover:ui-color-text',
			'desktop:ui-color-primary',
			'desktop:ui-color-text',
			'desktop:hover:ui-color-primary',
			'desktop:hover:ui-color-text',
		])
	})

	test('as css: escaped selectors, plain utilities first, then one block per breakpoint in config order', () => {
		const stitches = createStitches({ ...config, root: null })

		expect(utilityCss(stitches, { properties: ['color'], states: ['hover'] })).toBe(
			'.color-primary{color:var(--colors-primary)}.color-text{color:var(--colors-text)}' +
				'.hover\\:color-primary:hover{color:var(--colors-primary)}.hover\\:color-text:hover{color:var(--colors-text)}' +
				'@media (min-width: 768px){.tablet\\:color-primary{color:var(--colors-primary)}.tablet\\:color-text{color:var(--colors-text)}.tablet\\:hover\\:color-primary:hover{color:var(--colors-primary)}.tablet\\:hover\\:color-text:hover{color:var(--colors-text)}}' +
				'@media (min-width: 1200px){.desktop\\:color-primary{color:var(--colors-primary)}.desktop\\:color-text{color:var(--colors-text)}.desktop\\:hover\\:color-primary:hover{color:var(--colors-primary)}.desktop\\:hover\\:color-text:hover{color:var(--colors-text)}}',
		)
	})

	test('every property in the default themeMap by default', () => {
		const stitches = createStitches({ ...config, root: null })
		const properties = new Set(utilityClasses(stitches, { responsive: false }).map(({ property }) => property))

		for (const property of ['padding', 'margin-top', 'gap', 'color', 'background-color', 'border-color', 'border']) expect(properties.has(property)).toBe(true)
	})
})

describe('bundleCss', () => {
	const defineStyles = ({ css, globalCss }) => ({
		reset: globalCss({ body: { margin: 0 } }),
		button: css({ padding: '$1', color: '$text', variants: { tone: { brand: { color: '$primary' } } } }),
	})

	test('the theme, the globals and every component rule, as plain css, then the utilities', () => {
		const stitches = createStitches({ ...config, cascade: 'declared', root: null })
		const styles = defineStyles(stitches)
		const extracted = toPlainCss(extractCss(stitches, [styles]))

		const again = createStitches({ ...config, cascade: 'declared', root: null })
		const bundle = bundleCss(again, [defineStyles(again)], { utilities: { properties: ['color'], responsive: false } })

		expect(bundle).toBe(`${extracted}.color-primary{color:var(--colors-primary)}.color-text{color:var(--colors-text)}`)
		expect(bundle.startsWith(':root,.t-')).toBe(true)
		expect(bundle.includes('--sxs')).toBe(false)
		expect(bundle.includes('@media{')).toBe(false)
	})

	test('utilities: false leaves them out', () => {
		const stitches = createStitches({ ...config, root: null })

		expect(bundleCss(stitches, [defineStyles(stitches)], { utilities: false }).includes('.color-primary{')).toBe(false)
	})
})
