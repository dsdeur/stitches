// @vitest-environment jsdom
import * as React from 'react'
import { render } from './helpers/render.ts'
import { createStitches } from '../src/index.ts'

describe('Ref forwarding', () => {
	test('a ref reaches the component being styled', () => {
		const { styled } = createStitches({ root: null })

		let received: unknown = 'not called'
		const Target = React.forwardRef((props: Record<string, unknown>, ref) => {
			received = ref
			return React.createElement('div', props)
		})
		const Styled = styled(Target, { color: 'red' })
		const ref = React.createRef<HTMLDivElement>()

		render(React.createElement(Styled, { ref }))

		expect(received).toBe(ref)
	})

	test('no ref prop is added to the element when the caller passes none', () => {
		// React 19 treats `ref` as an ordinary prop, so assigning it unconditionally would leave
		// `ref: null` on every rendered element.
		const { styled } = createStitches({ root: null })

		// A host element cannot show a null ref, so observe the props React hands a component instead.
		let received: Record<string, unknown> = {}
		const Probe = (props: Record<string, unknown>) => {
			received = props
			return React.createElement('div', { className: String(props.className) })
		}
		const Div = styled(Probe, { color: 'red' })

		render(React.createElement(Div))

		expect('ref' in received).toBe(false)
		expect(received.className).toBe('c-gmqXFB')
	})
})
