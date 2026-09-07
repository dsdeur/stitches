// Plain JS on purpose: a fake CSSOM cannot satisfy the DOM types without casts.
import { createStitches } from '../src/index.ts'

/**
 * A stylesheet that re-serializes everything it is given, the way browsers do: reading cssText
 * back gives something other than what was inserted. Chrome expands shorthands (so
 * `padding:var(--x);padding-bottom:0` returns empty longhands) and can reorder declarations
 * around `all:unset`. getCssText() must never depend on this.
 */
const createManglingSheet = () => {
	const createRule = (text) => {
		const cssRules = []
		return {
			type: text.startsWith('@media') ? 4 : 1,
			cssRules,
			insertRule(childText, index) {
				cssRules.splice(index, 0, createRule(childText))
			},
			get cssText() {
				return '/* MANGLED BY THE BROWSER */'
			},
		}
	}

	const cssRules = []

	return {
		cssRules,
		deleteRule(index) {
			cssRules.splice(index, 1)
		},
		insertRule(text, index) {
			cssRules.splice(index, 0, createRule(text))
			return index
		},
	}
}

/** A shadow-root-like host whose style element is backed by the mangling sheet. */
const createRoot = () => {
	const sheet = createManglingSheet()
	return {
		nodeType: 11,
		styleSheets: [],
		ownerDocument: { createElement: () => ({ setAttribute() {}, sheet }) },
		appendChild: (element) => element,
	}
}

const config = { theme: { space: { 1: '12px' } } }

describe('getCssText() serializes the css it applied, not the css the browser reports', () => {
	test('a shorthand followed by a longhand survives (upstream #1094)', () => {
		const { css, getCssText } = createStitches({ ...config, root: createRoot() })

		css({ padding: '$1', paddingBottom: 0 })()

		const cssText = getCssText()

		expect(cssText.includes('padding:var(--space-1);padding-bottom:0')).toBe(true)
		expect(cssText.includes('MANGLED')).toBe(false)
	})

	test('declaration order around all:unset survives (upstream #1166)', () => {
		const { css, getCssText } = createStitches({ ...config, root: createRoot() })

		css({ all: 'unset', borderRadius: '12px' })()

		expect(getCssText().includes('all:unset;border-radius:12px')).toBe(true)
	})

	test('output from a browser sheet is identical to output from the server', () => {
		const styles = { padding: '$1', paddingBottom: 0, variants: { size: { lg: { fontSize: 16 } } } }

		const server = createStitches({ ...config, root: null })
		server.css(styles)({ size: 'lg' })

		const client = createStitches({ ...config, root: createRoot() })
		client.css(styles)({ size: 'lg' })

		expect(client.getCssText()).toBe(server.getCssText())
	})

	test('@import rules still come before every group', () => {
		const { css, globalCss, getCssText } = createStitches({ ...config, root: createRoot() })

		css({ color: 'red' })()
		globalCss({ '@import': 'https://unpkg.com/sanitize.css', body: { margin: 0 } })()

		const cssText = getCssText()

		expect(cssText.startsWith('@import "https://unpkg.com/sanitize.css";')).toBe(true)
		expect(cssText.includes('body{margin:0}')).toBe(true)
	})

	test('a rule the sheet rejects is left out of the text as well', () => {
		const root = createRoot()
		const styleSheet = root.ownerDocument.createElement().sheet
		const { insertRule } = styleSheet
		styleSheet.insertRule = (text, index) => {
			if (text.includes('unsupported')) throw new Error('unsupported css')
			return insertRule.call(styleSheet, text, index)
		}

		const { css, getCssText } = createStitches({ ...config, root })

		css({ color: 'red' })()

		expect(getCssText().includes('color:red')).toBe(true)
	})

	test('reset() empties the text as well as the sheet', () => {
		const { css, getCssText, reset } = createStitches({ ...config, root: createRoot() })

		css({ color: 'red' })()
		expect(getCssText().includes('color:red')).toBe(true)

		reset()
		// the default theme is re-applied by reset(), so only the component rule must be gone
		expect(getCssText().includes('color:red')).toBe(false)
		expect(getCssText().includes('--space-1:12px')).toBe(true)
	})
})

describe('Hydrating a stylesheet that has empty groups', () => {
	/** A preloaded sheet holding a marker and an empty grouping rule, serialized the way a browser does. */
	const createHydratableRoot = () => {
		const group = { type: 4, cssRules: [], insertRule(text, index) { this.cssRules.splice(index, 0, { type: 1, cssText: text }) }, cssText: '@media  {\n}' }
		const cssRules = [{ type: 1, cssText: '--sxs{--sxs:2 c-known}' }, group]

		return {
			nodeType: 11,
			styleSheets: [{ cssRules, insertRule(text, index) { cssRules.splice(index, 0, { type: 1, cssText: text }) }, deleteRule(index) { cssRules.splice(index, 1) } }],
			ownerDocument: { createElement: () => ({ setAttribute() {}, sheet: null }) },
			appendChild: (element) => element,
		}
	}

	test('an empty group is not emitted as a bare wrapper', () => {
		// A real empty grouping rule serializes as `@media {}` with browser whitespace. That is not
		// content, and emitting it produced stray `@media  {}` blocks in getCssText() output.
		const { getCssText } = createStitches({ root: createHydratableRoot() })

		expect(getCssText().includes('@media  ')).toBe(false)
		expect(getCssText()).toBe('')
	})

	test('a rule rendered after hydration still comes out', () => {
		const { css, getCssText } = createStitches({ root: createHydratableRoot() })

		css({ color: 'red' })()

		expect(getCssText().includes('color:red')).toBe(true)
		expect(getCssText().includes('@media  ')).toBe(false)
	})
})
