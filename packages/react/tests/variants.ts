import { createStitches } from '../src/index.ts'

import type { ReactElement } from 'react'

function render(component: { render?: (props?: Record<string, unknown>, ref?: unknown) => ReactElement | null }, props?: Record<string, unknown>): ReactElement {
	if (!component.render) throw new Error('render is undefined')
	const result = component.render(props)
	if (result === null) throw new Error('render returned null')
	return result
}

describe('Variants', () => {
	test('Variant given undefined will revert to the default', () => {
		const { styled } = createStitches()
		const component = styled('div', {
			variants: {
				color: {
					blue: {
						color: 'blue',
					},
					red: {
						color: 'red',
					},
				},
			},
			defaultVariants: {
				color: 'blue',
			},
		})

		const expression1 = render(component,)
		expect(expression1.props.className).toBe('c-PJLV c-PJLV-kydkiA-color-blue')

		const expression3 = render(component,{ color: undefined })
		expect(expression3.props.className).toBe('c-PJLV c-PJLV-kydkiA-color-blue')
	})

	test('Variant with an explicit undefined will not use default variant', () => {
		const { styled } = createStitches()
		const component = styled('div', {
			variants: {
				color: {
					blue: {
						color: 'blue',
					},
					red: {
						color: 'red',
					},
					undefined: {
						color: 'transparent',
					},
				},
			},
			defaultVariants: {
				color: 'blue',
			},
		})

		const expression1 = render(component,)
		expect(expression1.props.className).toBe('c-PJLV c-PJLV-kydkiA-color-blue')

		const expression2 = render(component,{ color: 'red' })
		expect(expression2.props.className).toBe('c-PJLV c-PJLV-gmqXFB-color-red')

		const expression3 = render(component,{ color: undefined })
		expect(expression3.props.className).toBe('c-PJLV c-PJLV-hzqlOY-color-undefined')
	})
})
