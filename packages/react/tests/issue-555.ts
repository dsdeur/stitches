import * as React from 'react'
import * as renderer from 'react-test-renderer'
import { createStitches } from '../src/index.ts'

import type { ReactTestRendererJSON } from 'react-test-renderer'

const RenderOf = (element: React.ReactElement): ReactTestRendererJSON => {
	let Rendered: renderer.ReactTestRenderer | undefined

	void renderer.act(() => {
		Rendered = renderer.create(element)
	})

	if (Rendered === undefined) throw new Error('Rendered is undefined')
	const json = Rendered.toJSON()
	if (json === null || Array.isArray(json)) throw new Error('Unexpected JSON structure')
	const { props } = json

	for (const prop in props) {
		const value = props[prop]

		// serialize objects as they might appear in a render
		if (typeof value === 'object' && value !== null && value.toString) {
			props[prop] = value.toString()
		}
	}

	return json
}

describe('Issue #555', () => {
	test('an element accepts styles via className prop', () => {
		const { css, toString } = createStitches()

		const el = css({ color: 'dodgerblue' })

		expect(RenderOf(React.createElement('div', { className: el() }))).toEqual({
			type: 'div',
			props: {
				className: 'c-jEKtXH',
			},
			children: null,
		})

		expect(toString()).toBe(`--sxs{--sxs:2 c-jEKtXH}@media{.c-jEKtXH{color:dodgerblue}}`)
	})

	test('an element accepts styles via className prop', () => {
		const { css, styled, toString } = createStitches()

		const el = css({ color: 'dodgerblue' })
		const Box = styled('div', {})

		expect(RenderOf(React.createElement(Box, { className: el() }))).toEqual({
			type: 'div',
			props: {
				className: 'c-PJLV c-jEKtXH',
			},
			children: null,
		})

		expect(toString()).toBe(`--sxs{--sxs:2 c-jEKtXH c-PJLV}@media{.c-jEKtXH{color:dodgerblue}}`)
	})
})
