// Renders through react-dom into a jsdom container, replacing the deprecated react-test-renderer.
// Files that use it declare `// @vitest-environment jsdom`.
//
// Stitches itself still writes to its mock sheet in these files (`createStitches({ root: null })`),
// as it did when they ran in the node environment: jsdom's CSS parser rejects the `--sxs{…}`
// hydration marker that every real browser accepts, so pointing stitches at jsdom's document would
// test jsdom, not stitches. `yarn test:browser` covers stitches against a real document.
import * as React from 'react'
import { createRoot } from 'react-dom/client'

// React only flushes updates inside act() synchronously when it is told it runs under test.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

export interface Rendered {
	/** The element the tree was rendered into. */
	readonly container: HTMLElement
	/** The first element the tree rendered, for asserting on its attributes. */
	readonly element: Element
	readonly rerender: (next: React.ReactElement) => void
}

export const render = (tree: React.ReactElement): Rendered => {
	const container = document.createElement('div')
	const root = createRoot(container)

	React.act(() => root.render(tree))

	return {
		container,
		get element() {
			const first = container.firstElementChild

			if (!first) throw new Error('nothing was rendered')

			return first
		},
		rerender: (next) => React.act(() => root.render(next)),
	}
}
