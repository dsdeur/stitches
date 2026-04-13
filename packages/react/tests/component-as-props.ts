import { createStitches } from '../src/index.ts'

import type { ReactElement } from 'react'

function render(component: { render?: (props?: Record<string, unknown>, ref?: unknown) => ReactElement | null }, props?: Record<string, unknown>): ReactElement {
	if (!component.render) throw new Error('render is undefined')
	const result = component.render(props)
	if (result === null) throw new Error('render returned null')
	return result
}

describe('As prop', () => {
	test('The "as" property can be used or overridden', () => {
		const { styled } = createStitches()
		const component1 = styled()

		const expression1 = render(component1)

		expect(expression1.type).toBe('span')

		const component2 = styled('div')
		const expression2 = render(component2)

		expect(expression2.type).toBe('div')

		const expression2a = render(component2, { as: 'span' })

		expect(expression2a.type).toBe('span')
	})

	test('The "as" property is followed during extension', () => {
		const { styled } = createStitches()
		const component1 = styled('div')
		const component2 = styled(component1)
		const expression = render(component2)

		expect(expression.type).toBe('div')

		const expression2a = render(component2, { as: 'span' })

		expect(expression2a.type).toBe('span')
	})
})
