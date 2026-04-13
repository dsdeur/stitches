import { createStitches } from '../src/index.ts'
import type { ReactElement } from 'react'

function render(component: { render?: (props?: Record<string, unknown>, ref?: unknown) => ReactElement | null }, props?: Record<string, unknown>): ReactElement {
	if (!component.render) throw new Error('render is undefined')
	const result = component.render(props)
	if (result === null) throw new Error('render returned null')
	return result
}

describe('Composition', () => {
	test('Renders an empty component', () => {
		const { styled, getCssText } = createStitches()
		const generic = styled()
		expect(render(generic).props).toEqual({ className: 'PJLV' })
		expect(getCssText()).toBe('')
	})

	test('Does not render a component without an explicit rendering', () => {
		const { styled, getCssText } = createStitches()
		const red = styled({ color: 'red' })
		const size14 = styled({ fontSize: '14px' })
		const bold = styled({ fontWeight: 'bold' })
		const title = styled(red, size14, bold, { fontFamily: 'monospace' })
		expect(`${title}`).toBe('.c-gmqXFB:where(.c-hzkWus.c-cQFdVt.c-kngyIZ)')
		expect(getCssText()).toBe('')
	})

	test('Renders a component with all compositions', () => {
		const { styled, getCssText } = createStitches()
		const red = styled({ color: 'red' })
		const size14 = styled({ fontSize: '14px' })
		const bold = styled({ fontWeight: 'bold' })
		const title = styled(red, size14, bold, { fontFamily: 'monospace' })
		expect(render(title).props.className).toBe('c-gmqXFB c-hzkWus c-cQFdVt c-kngyIZ')
		expect(getCssText()).toBe('--sxs{--sxs:2 c-gmqXFB c-hzkWus c-cQFdVt c-kngyIZ}@media{.c-gmqXFB{color:red}.c-hzkWus{font-size:14px}.c-cQFdVt{font-weight:bold}.c-kngyIZ{font-family:monospace}}')
	})
})
