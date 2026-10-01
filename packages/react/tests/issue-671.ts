// @vitest-environment jsdom
import * as React from 'react'
import { render } from './helpers/render.ts'
import { createStitches } from '../src/index.ts'

describe('Issue #671', () => {
	{
		const { styled, getCssText } = createStitches({ root: null })

		const StyledBase = styled('div', { color: 'red' })
		const Base = (props: Record<string, unknown>) => React.createElement(StyledBase, { ...props })
		const Bar = styled(Base, { color: 'blue' })

		const App = () => {
			return React.createElement(
				'div',
				null,
				// children
				React.createElement(Bar, {}),
			)
		}

		render(React.createElement(App))

		test('a stitches component extending a react component will inject the styles in the correct order', () => {
			expect(getCssText()).toBe(`--sxs{--sxs:2 c-kydkiA c-gmqXFB}@media{.c-gmqXFB{color:red}.c-kydkiA{color:blue}}`)
		})
	}
})
