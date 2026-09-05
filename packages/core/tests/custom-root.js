// Plain JS on purpose: a fake DOM root cannot satisfy the `DocumentOrShadowRoot & Node` type
// without a cast, and the tests tsconfig has no DOM test doubles.
import { createStitches } from '../src/index.ts'

/** A ShadowRoot-like host: cyclic (like every real DOM node) and without a live CSSOM sheet. */
const createFakeRoot = () => {
	const root = {
		nodeType: 11,
		styleSheets: [],
		ownerDocument: { createElement: () => ({ setAttribute() {}, sheet: null }) },
		appendChild: (element) => element,
	}
	root.host = { shadowRoot: root }
	return root
}

describe('Custom root', () => {
	test('a cyclic root (like a real Document or ShadowRoot) does not break config memoization (upstream #832)', () => {
		const root = createFakeRoot()
		const stitches = createStitches({ root })

		expect(typeof stitches.css).toBe('function')
	})

	test('styles for a custom root render into that root, not the global mock', () => {
		const root = createFakeRoot()
		const { css, getCssText } = createStitches({ prefix: 'r1', root })

		css({ color: 'red' })()

		expect(getCssText().includes('color:red')).toBe(true)
	})

	test('the same config with different roots yields separate instances and sheets', () => {
		const a = createStitches({ prefix: 'r2', root: createFakeRoot() })
		const b = createStitches({ prefix: 'r2', root: createFakeRoot() })

		expect(a).not.toBe(b)
		expect(a.sheet).not.toBe(b.sheet)
	})

	test('the same config with the same root yields the same instance', () => {
		const root = createFakeRoot()

		expect(createStitches({ prefix: 'r3', root })).toBe(createStitches({ prefix: 'r3', root }))
	})
})

describe('Root defaults', () => {
	/** A Document-like root that counts how many style elements were requested from it. */
	const createFakeDocument = () => {
		const doc = {
			nodeType: 9,
			styleSheets: [],
			createElementCalls: 0,
			head: { appendChild: (element) => element },
			createElement() {
				this.createElementCalls++
				return { setAttribute() {}, sheet: null }
			},
		}
		return doc
	}

	const withDocument = (doc, run) => {
		globalThis.document = doc
		try {
			run()
		} finally {
			delete globalThis.document
		}
	}

	test('an explicitly undefined root falls back to the document, as in 1.2.x', () => {
		const doc = createFakeDocument()
		withDocument(doc, () => {
			createStitches({ prefix: 'rd1', root: undefined })
		})
		expect(doc.createElementCalls).toBe(1)
	})

	test('an absent root also uses the document', () => {
		const doc = createFakeDocument()
		withDocument(doc, () => {
			createStitches({ prefix: 'rd2' })
		})
		expect(doc.createElementCalls).toBe(1)
	})

	test('a null root never touches the document', () => {
		const doc = createFakeDocument()
		withDocument(doc, () => {
			createStitches({ prefix: 'rd3', root: null })
		})
		expect(doc.createElementCalls).toBe(0)
	})
})
