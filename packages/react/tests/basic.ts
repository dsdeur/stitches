// @vitest-environment jsdom
import * as React from 'react'
import { render } from './helpers/render.ts'
import { createStitches } from '../src/index.ts'

describe('Basic', () => {
	test('Functionality of styled()', () => {
		const { styled, getCssText } = createStitches({
			root: null,
			utils: {
				userSelect: ((value: string) => ({
					WebkitUserSelector: value,
					userSelect: value,
				})) as never,
			},
		})

		const Button = styled('button', {
			'backgroundColor': 'gainsboro',
			'borderRadius': '9999px',
			'fontWeight': 500,
			'padding': '0.75em 1em',
			'border': 0,
			'transition': 'all 200ms ease',

			'&:hover': {
				transform: 'translateY(-2px)',
				boxShadow: '0 10px 25px rgba(0, 0, 0, .3)',
			},
		})

		const { container } = render(React.createElement(Button as React.ElementType, null, 'Hello, World!'))

		expect(container.innerHTML).toBe('<button class="c-iSEgvG">Hello, World!</button>')

		expect(getCssText()).toBe(
			`--sxs{--sxs:2 c-iSEgvG}@media{.c-iSEgvG{background-color:gainsboro;border-radius:9999px;font-weight:500;padding:0.75em 1em;border:0;transition:all 200ms ease}.c-iSEgvG:hover{transform:translateY(-2px);box-shadow:0 10px 25px rgba(0, 0, 0, .3)}}`,
		)
	})
})
