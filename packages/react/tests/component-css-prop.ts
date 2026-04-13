import { createStitches } from '../src/index.ts'
import type { ReactElement } from 'react'

function render(component: { render?: (props?: Record<string, unknown>, ref?: unknown) => ReactElement | null }, props?: Record<string, unknown>): ReactElement {
	if (!component.render) throw new Error('render is undefined')
	const result = component.render(props)
	if (result === null) throw new Error('render returned null')
	return result
}

describe('React Component with CSS prop', () => {
	test('Authors can create a component and pass it a css prop of overrides', () => {
		const { styled, toString } = createStitches()

		const component = styled('button', {
			order: 1,
		})
		render(component, {
			css: {
				order: 2,
			},
		})

		expect(toString()).toBe(`--sxs{--sxs:2 c-hhyRYU}@media{.c-hhyRYU{order:1}}--sxs{--sxs:6 c-hhyRYU-ilhKMMn-css}@media{.c-hhyRYU-ilhKMMn-css{order:2}}`)
	})

	test('React example from Radix', () => {
		const { styled, toString } = createStitches({
			media: {
				bp2: '(min-width: 900px)',
			},
		})

		const component = styled('button', {
			color: 'inherit',
		})
		const expression = render(component, {
			css: {
				'fontWeight': 500,
				'fontVariantNumeric': 'proportional-nums',
				'lineHeight': '35px',
				'@bp2': {
					lineHeight: '55px',
					color: 'red',
				},
			},
		})

		expect(expression.props).toEqual({
			className: 'c-bHwuwj c-bHwuwj-ibwrayD-css',
		})

		expect(toString()).toBe(
			`--sxs{--sxs:2 c-bHwuwj}@media{.c-bHwuwj{color:inherit}}--sxs{--sxs:6 c-bHwuwj-ibwrayD-css}@media{.c-bHwuwj-ibwrayD-css{font-weight:500;font-variant-numeric:proportional-nums;line-height:35px}@media (min-width: 900px){.c-bHwuwj-ibwrayD-css{line-height:55px;color:red}}}`,
		)
	})
})
