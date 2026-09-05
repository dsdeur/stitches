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

/** Turns `getCssText()` output into the minimal CSSOM shape the hydration code reads. */
const toFakeSheet = (cssText) => {
	const cssRules = []
	for (const rule of splitRules(cssText)) {
		if (rule.startsWith('--sxs{')) cssRules.push({ type: 1, cssText: rule })
		else if (rule.startsWith('@media{')) {
			const inner = splitRules(rule.slice('@media{'.length, -1)).map((text) => ({ type: 1, cssText: text }))
			cssRules.push({
				type: 4,
				cssRules: inner,
				insertRule(text, index) {
					inner.splice(index, 0, { type: 1, cssText: text })
				},
				get cssText() {
					return `@media{${inner.map((r) => r.cssText).join('')}}`
				},
			})
		}
	}
	return { cssRules, insertRule() {}, deleteRule() {} }
}

describe("cascade: 'declared' hydration", () => {
	test('a rule rendered only on the client is positioned by its key among server-rendered rules', () => {
		const media = { md: '(min-width: 768px)' }
		const style = { variants: { size: { sm: { fontSize: 12 }, lg: { fontSize: 16 } } } }

		// server: only the later-declared variant value was rendered
		const server = createStitches({ cascade: 'declared', media, root: null })
		server.css(style)({ size: 'lg' })
		const serverCss = server.getCssText()

		// client: hydrate from that output, then render the earlier-declared value
		const root = { nodeType: 11, styleSheets: [toFakeSheet(serverCss)], ownerDocument: null, appendChild: (el) => el }
		const client = createStitches({ cascade: 'declared', media, root })
		client.css(style)({ size: 'sm' })

		const clientCss = client.getCssText().replace(/--sxs\{[^}]*\}/g, '')
		expect(clientCss.indexOf('{font-size:12px}') < clientCss.indexOf('{font-size:16px}')).toBe(true)
		// the server-rendered rule is still there exactly once
		expect(clientCss.split('{font-size:16px}').length).toBe(2)
	})
})
