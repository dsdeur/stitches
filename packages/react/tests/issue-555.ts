// @vitest-environment jsdom
import * as React from 'react'
import { createStitches } from '../src/index.ts'
import { render } from './helpers/render.ts'

/** The rendered markup. A className that is an object renders through its toString(), as it would in a page. */
const RenderOf = (element: React.ReactElement): string => render(element).container.innerHTML

describe('Issue #555', () => {
	test('an element accepts styles via className prop', () => {
		const { css, toString } = createStitches({ root: null })

		const el = css({ color: 'dodgerblue' })

		expect(RenderOf(React.createElement('div', { className: el() }))).toBe('<div class="c-jEKtXH"></div>')

		expect(toString()).toBe(`--sxs{--sxs:2 c-jEKtXH}@media{.c-jEKtXH{color:dodgerblue}}`)
	})

	test('an element accepts styles via className prop', () => {
		const { css, styled, toString } = createStitches({ root: null })

		const el = css({ color: 'dodgerblue' })
		const Box = styled('div', {})

		expect(RenderOf(React.createElement(Box, { className: el() }))).toBe('<div class="c-PJLV c-jEKtXH"></div>')

		expect(toString()).toBe(`--sxs{--sxs:2 c-jEKtXH c-PJLV}@media{.c-jEKtXH{color:dodgerblue}}`)
	})
})
