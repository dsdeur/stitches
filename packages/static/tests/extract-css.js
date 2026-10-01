// Plain JS on purpose: the hydration half builds a fake CSSOM from the extracted text, the same way
// core's cascade-declared-hydration test does, and that cannot satisfy the DOM types.
import * as React from 'react'
import * as renderer from 'react-test-renderer'
import { createStitches as createCoreStitches } from '../../core/src/index.ts'
import { createStitches as createReactStitches } from '../../react/src/index.ts'
import { extractCss } from '../src/index.ts'
import { toHydratingRoot } from './helpers/fake-sheet.js'

const withoutMarkers = (cssText) => cssText.replace(/--sxs\{[^}]*\}/g, '')

const media = { bp1: '(min-width: 640px)', bp2: '(min-width: 960px)' }

/** A style module: what `import * as styles from './styles'` hands the extractor. */
const defineStyles = ({ css, globalCss, keyframes, createTheme }) => {
	const fadeIn = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } })

	const button = css({
		color: 'black',
		animation: `${fadeIn} 200ms`,
		variants: {
			size: { small: { fontSize: 12 }, large: { fontSize: 16 } },
			tone: { neutral: { color: 'gray' }, brand: { color: 'blue' } },
			raised: { true: { boxShadow: '0 1px 2px black' } },
		},
		compoundVariants: [{ size: 'large', tone: 'brand', css: { fontWeight: 700 } }],
		defaultVariants: { size: 'small' },
	})

	return Object.freeze(
		Object.assign(Object.create(null), {
			button,
			iconButton: css(button, { padding: 4, variants: { shape: { round: { borderRadius: 999 } } } }),
			card: { root: css({ padding: 8 }), title: css({ fontWeight: 600 }) },
			darkTheme: createTheme('dark', { colors: { text: 'white' } }),
			globalStyles: globalCss({ body: { margin: 0 } }),
			fadeIn,
			helper: () => {
				throw new Error('an ordinary exported function must not be called')
			},
		}),
	)
}

describe('extractCss', () => {
	for (const cascade of ['legacy', 'declared', 'atomic']) {
		// atomic output is its own option; it runs with the default cascade
		const modeOf = (mode) => (mode === 'atomic' ? { atomic: true } : { cascade: mode })

		test(`${cascade}: after hydrating from the file, rendering every variant injects nothing`, () => {
			const server = createCoreStitches({ ...modeOf(cascade), media, root: null })
			const extracted = extractCss(server, [defineStyles(server)])

			const client = createCoreStitches({ ...modeOf(cascade), media, root: toHydratingRoot(extracted) })
			const styles = defineStyles(client)
			const { button, iconButton } = styles

			for (const size of ['small', 'large']) {
				for (const tone of ['neutral', 'brand']) {
					button({ size, tone, raised: true })
					iconButton({ size: { '@initial': size, '@bp2': 'large' }, tone: { '@bp2': tone }, shape: { '@bp1': 'round' } })
				}
			}
			styles.card.root()
			styles.card.title()
			String(styles.darkTheme)
			styles.globalStyles()

			expect(client.getCssText()).toBe(extracted)
		})

		test(`${cascade}: a combination the file lacks is injected at runtime, into the hydrated sheet`, () => {
			const server = createCoreStitches({ ...modeOf(cascade), media, root: null })
			const extracted = extractCss(server, [defineStyles(server)])

			const client = createCoreStitches({ ...modeOf(cascade), media, root: toHydratingRoot(extracted) })
			// a compound variant whose conditions hold at different breakpoints is its own class
			const { button } = defineStyles(client)
			const { className } = button({ size: { '@bp2': 'large' }, tone: { '@bp1': 'brand' } })
			// in atomic output a component's own class carries no rule, so it is never in the file
			const injected = className.split(' ').filter((name) => name !== button.className && !extracted.includes(name))

			expect(injected).toHaveLength(1)
			expect(client.getCssText()).toContain(`.${injected[0]}{font-weight:700}`)
		})
	}

	test('writes base styles, every variant value, compound variants, themes, globals and keyframes', () => {
		const stitches = createCoreStitches({ media, root: null })
		const cssText = withoutMarkers(extractCss(stitches, [defineStyles(stitches)]))

		expect(cssText).toContain('{color:black;animation:k-')
		for (const declaration of ['font-size:12px', 'font-size:16px', 'color:gray', 'color:blue', 'box-shadow:0 1px 2px black', 'font-weight:700', 'padding:4px', 'border-radius:999px', 'padding:8px', 'font-weight:600']) {
			expect(cssText).toContain(`{${declaration}}`)
		}

		expect(cssText).toContain('.dark{--colors-text:white}')
		expect(cssText).toContain('body{margin:0}')
		expect(cssText).toMatch(/@keyframes k-\w+\{from\{opacity:0\}to\{opacity:1\}\}/)
	})

	test('renders each variant value and each compound variant at every breakpoint', () => {
		const stitches = createCoreStitches({ media, root: null })
		const cssText = extractCss(stitches, [defineStyles(stitches)])

		expect(cssText).toContain('@media (min-width: 640px){')
		expect(cssText).toContain('@media (min-width: 960px){')
		expect(cssText).toMatch(/@media \(min-width: 960px\)\{\.c-\w+-\w+-size-large\{font-size:16px\}\}/)
		// both conditions at the same breakpoint
		expect(cssText).toMatch(/@media \(min-width: 640px\)\{@media \(min-width: 640px\)\{\.c-\w+-\w+-cv\{font-weight:700\}\}\}/)
	})

	test('responsive: false leaves breakpoints to the runtime', () => {
		const stitches = createCoreStitches({ media, root: null })
		const cssText = extractCss(stitches, [defineStyles(stitches)], { responsive: false })

		expect(cssText).not.toContain('@media (')
		expect(withoutMarkers(cssText)).toContain('{font-size:16px}')
	})

	test('extracts styled components, including one wrapping a React component', () => {
		const stitches = createReactStitches({ cascade: 'declared', root: null })
		const { styled } = stitches
		const Label = styled('span', { color: 'red', variants: { muted: { true: { opacity: 0.5 } } } })
		const Passthrough = (props) => React.createElement(Label, props)
		const Wrapped = styled(Passthrough, { color: 'blue', variants: { loud: { true: { fontWeight: 900 } } } })

		const cssText = withoutMarkers(extractCss(stitches, [{ Label, Wrapped }]))

		for (const declaration of ['color:red', 'opacity:0.5', 'color:blue', 'font-weight:900']) expect(cssText).toContain(`{${declaration}}`)

		// and what the extractor wrote is what rendering the tree writes
		const rendered = createReactStitches({ cascade: 'declared', root: null, prefix: 'rendered' })
		const RenderedLabel = rendered.styled('span', { color: 'red', variants: { muted: { true: { opacity: 0.5 } } } })
		const RenderedWrapped = rendered.styled((props) => React.createElement(RenderedLabel, props), { color: 'blue', variants: { loud: { true: { fontWeight: 900 } } } })
		renderer.act(() => {
			renderer.create(React.createElement(RenderedWrapped, { loud: true, muted: true }))
		})
		expect(withoutMarkers(rendered.getCssText()).replace(/rendered-/g, '')).toBe(cssText)
	})

	test('walks four levels into plain objects, and leaves anything deeper to the runtime', () => {
		const stitches = createCoreStitches({ root: null })
		const at = (depth, value) => (depth === 0 ? value : { nested: at(depth - 1, value) })

		const reached = stitches.css({ color: 'teal' })
		const tooDeep = stitches.css({ color: 'olive' })
		const cssText = extractCss(stitches, [at(4, reached), at(5, tooDeep)])

		expect(cssText).toContain('{color:teal}')
		expect(cssText).not.toContain('{color:olive}')
	})

	test('a keyframes value exported on its own is written even if no style names it', () => {
		const stitches = createCoreStitches({ root: null })
		const pulse = stitches.keyframes({ '50%': { opacity: 0.5 } })

		expect(extractCss(stitches, [{ pulse }])).toContain(`@keyframes ${pulse.name}{50%{opacity:0.5}}`)
	})

	for (const cascade of ['legacy', 'declared']) {
		test(`${cascade}: with a prefix, utils and tokens, the file still hydrates without a single injection`, () => {
			const config = {
				cascade,
				media,
				prefix: 'app',
				theme: { colors: { brand: 'tomato' }, space: { 1: '4px', 2: '8px' } },
				utils: { px: (value) => ({ paddingLeft: value, paddingRight: value }) },
			}
			const define = ({ css }) => ({
				chip: css({ px: '$1', color: '$brand', variants: { size: { lg: { px: '$2' } }, outline: { true: { border: '1px solid $brand' } } }, compoundVariants: [{ size: 'lg', outline: true, css: { borderWidth: 2 } }] }),
			})

			const server = createCoreStitches({ ...config, root: null })
			const extracted = extractCss(server, [define(server)])
			expect(extracted).toContain('.app-c-')
			expect(extracted).toContain('padding-left:var(--app-space-1)')

			const client = createCoreStitches({ ...config, root: toHydratingRoot(extracted) })
			const { chip } = define(client)
			chip({ size: { '@bp1': 'lg' }, outline: true })
			chip({ size: 'lg', outline: { '@bp2': true } })
			chip({ size: { '@bp2': 'lg' }, outline: { '@bp2': true } })

			expect(client.getCssText()).toBe(extracted)
		})
	}

	test('leaves ordinary values alone and survives cycles', () => {
		const stitches = createCoreStitches({ root: null })
		const cyclic = { label: (text) => text }
		cyclic.self = cyclic

		expect(() => extractCss(stitches, [cyclic, 1, 'text', null, undefined, new Map([[1, 2]])])).not.toThrow()
	})
})
