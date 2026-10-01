// Plain JS on purpose: builds a fake CSSOM from server output, which cannot satisfy the DOM types.
import { createStitches } from '../src/index.ts'

/** Splits `a{..}b{..}` into top-level rule strings, respecting nested braces. */
const splitRules = (text) => {
	const out = []
	let depth = 0
	let start = 0
	for (let i = 0; i < text.length; i++) {
		if (text[i] === '{') depth++
		else if (text[i] === '}' && --depth === 0) {
			out.push(text.slice(start, i + 1))
			start = i + 1
		}
	}
	return out
}

/** One parsed top-level rule: a marker, or a group whose children take inserts. */
const toRule = (text) => {
	if (!text.startsWith('@media{')) return { type: 1, cssText: text }
	const inner = splitRules(text.slice('@media{'.length, -1)).map((child) => ({ type: 1, cssText: child }))
	return {
		type: 4,
		cssRules: inner,
		insertRule(child, index) {
			inner.splice(index, 0, { type: 1, cssText: child })
		},
		get cssText() {
			return `@media{${inner.map((rule) => rule.cssText).join('')}}`
		},
	}
}

const toRoot = (cssText) => {
	const cssRules = splitRules(cssText).map(toRule)
	const sheet = { cssRules, insertRule: (text, index) => cssRules.splice(index, 0, toRule(text)), deleteRule: (index) => cssRules.splice(index, 1) }
	return { nodeType: 11, styleSheets: [sheet], ownerDocument: null, appendChild: (el) => el }
}

describe('atomic output: hydration', () => {
	const media = { md: '(min-width: 768px)' }
	const style = { 'padding': 4, 'color': 'black', '&:hover': { color: 'gray' }, 'variants': { tone: { loud: { color: 'red', paddingTop: 8 } } } }

	test('a client hydrating server output writes nothing it already has, and keys new rules into place', () => {
		const server = createStitches({ atomic: true, media, root: null })
		server.css(style)({ tone: { '@md': 'loud' } })
		const serverCss = server.getCssText()

		const client = createStitches({ atomic: true, media, root: toRoot(serverCss) })
		const component = client.css(style)
		component({ tone: { '@md': 'loud' } })
		expect(client.getCssText()).toBe(serverCss)

		// a new longhand lands after the hydrated shorthand
		component({ tone: 'loud' })
		const rules = client.getCssText().replace(/--sxs\{[^}]*\}/g, '')
		expect(rules.indexOf('{padding:4px}') < rules.indexOf('{padding-top:8px}')).toBe(true)
	})
})
