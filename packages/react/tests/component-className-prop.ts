import { createStitches } from '../src/index.ts'

import type { ReactElement } from 'react'

function render(component: { render?: (props?: Record<string, unknown>, ref?: unknown) => ReactElement | null }, props?: Record<string, unknown>): ReactElement {
	if (!component.render) throw new Error('render is undefined')
	const result = component.render(props)
	if (result === null) throw new Error('render returned null')
	return result
}

describe('className prop', () => {
	test('Renders a DOM Element with a class matching the className prop', () => {
		const { styled } = createStitches()

		const component = styled('div')
		const className = 'myClassName'
		const expression = render(component, { className })

		expect(expression.props.className).toBe(`PJLV ${className}`)
	})

	test('Renders a DOM Element with multiple classes passed as className', () => {
		const { styled } = createStitches()

		const component = styled('div')
		const className = 'myClassName1 myClassName2 myClassName3'
		const expression = render(component, { className })

		expect(expression.props.className).toBe(`PJLV ${className}`)
	})

	test('Renders a DOM Element withoup adding an undefined class', () => {
		const { styled } = createStitches()

		const component = styled('div')
		const className = undefined
		const expression = render(component, { className })

		expect(expression.props.className).toNotBe('undefined')
	})
})
