import * as React from 'react'
import * as renderer from 'react-test-renderer'
import { createStitches } from '../src/index.ts'

describe('Ref forwarding', () => {
	test('a ref reaches the component being styled', () => {
		const { styled } = createStitches()

		let received: unknown = 'not called'
		const Target = React.forwardRef((props: Record<string, unknown>, ref) => {
			received = ref
			return React.createElement('div', props)
		})
		const Styled = styled(Target, { color: 'red' })
		const ref = React.createRef<HTMLDivElement>()

		renderer.act(() => {
			renderer.create(React.createElement(Styled, { ref }))
		})

		expect(received).toBe(ref)
	})

	test('no ref prop is added to the element when the caller passes none', () => {
		// React 19 treats `ref` as an ordinary prop, so assigning it unconditionally would leave
		// `ref: null` on every rendered element.
		const { styled } = createStitches()

		const Div = styled('div', { color: 'red' })

		let wrapper: renderer.ReactTestRenderer | undefined
		renderer.act(() => {
			wrapper = renderer.create(React.createElement(Div))
		})

		const json = wrapper?.toJSON()
		if (!json || Array.isArray(json)) throw new Error('unexpected render output')

		expect('ref' in json.props).toBe(false)
		expect(json.props.className).toBe('c-gmqXFB')
	})
})
