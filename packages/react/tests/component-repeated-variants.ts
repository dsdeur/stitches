import { createStitches } from '../src/index.ts'
import type { ReactElement } from 'react'

function render(component: { render?: (props?: Record<string, unknown>, ref?: unknown) => ReactElement | null }, props?: Record<string, unknown>): ReactElement {
	if (!component.render) throw new Error('render is undefined')
	const result = component.render(props)
	if (result === null) throw new Error('render returned null')
	return result
}

describe('emerson', () => {
	test('lake', () => {
		const { styled, toString } = createStitches({
			utils: {
				px: (value: string | number | boolean | null | undefined) => ({
					paddingLeft: value,
					paddingRight: value,
				}),
			},
		})

		const component = styled('span', {
			variants: {
				size: {
					'1': {
						px: '$1',
					},
					'2': {
						px: '$2',
					},
				},
			},
		})

		const cssText = `--sxs{--sxs:3 c-PJLV-efCiES-size-1}@media{` + `.c-PJLV-efCiES-size-1{padding-left:var(--space-1);padding-right:var(--space-1)}` + `}`

		render(component, { size: '1' })

		expect(toString()).toBe(cssText)

		render(component, { size: '1' })

		expect(toString()).toBe(cssText)

		render(component, { size: '1' })

		expect(toString()).toBe(cssText)
	})
})
