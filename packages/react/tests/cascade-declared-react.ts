// @vitest-environment jsdom
import * as React from 'react'
import { render } from './helpers/render.ts'
import { createStitches } from '../src/index.ts'

describe("cascade: 'declared' with styled(ReactComponent)", () => {
	test('a component wrapping a React component ranks above the stitches components that component renders (issue-416 pattern)', () => {
		const { styled, getCssText } = createStitches({ cascade: 'declared', root: null })

		const Inner = styled('span', { variants: { foo: { bar: { color: 'red' } } } })
		const Passthrough = (props: Record<string, unknown>) => React.createElement(Inner, props)
		const Outer = styled(Passthrough, { variants: { foo: { bar: { color: 'blue' } } } })

		render(React.createElement(Outer, { foo: 'bar' }))

		const cssText = getCssText().replace(/--sxs\{[^}]*\}/g, '')
		expect(cssText.indexOf('{color:red}') < cssText.indexOf('{color:blue}')).toBe(true)
	})
})
