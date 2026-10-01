// Plain JS on purpose: a fake document and window cannot satisfy the DOM types.
import { createStitches } from '../src/index.ts'

/** A document whose created <style> elements record their attributes and carry a mock sheet. */
const fakeDocument = () => {
	const created = []
	const document = {
		nodeType: 9,
		styleSheets: [],
		head: { appendChild: (element) => element },
		createElement: () => {
			const element = {
				attributes: {},
				setAttribute(name, value) {
					this.attributes[name] = value
				},
				sheet: {
					cssRules: [],
					insertRule(text, index) {
						this.cssRules.splice(index, 0, { cssText: text, cssRules: [], insertRule() {} })
					},
					deleteRule() {},
				},
			}
			created.push(element)
			return element
		},
	}
	return { document, created }
}

describe('a CSP nonce', () => {
	afterEach(() => {
		delete globalThis.window
	})

	for (const [name, global] of [
		['webpack', { __webpack_nonce__: 'from-webpack' }],
		['window.nonce', { nonce: 'from-window' }],
	]) {
		test(`is set on the injected <style> from ${name}`, () => {
			globalThis.window = global
			const { document, created } = fakeDocument()

			createStitches({ root: document, prefix: name })

			expect(created).toHaveLength(1)
			expect(created[0].attributes.nonce).toBe(Object.values(global)[0])
		})
	}

	test('is left off when the page sets none', () => {
		globalThis.window = {}
		const { document, created } = fakeDocument()

		createStitches({ root: document, prefix: 'none' })

		expect(created[0].attributes).toEqual({})
	})
})
