import * as React from 'react'
import * as renderer from 'react-test-renderer'
import { createStitches } from '../src/react/index.ts'

// A window size change (rotation, split screen, a resized iPad window) must re-render only the
// components whose styles can depend on it: on a phone every avoided render is battery.
describe('re-renders on a viewport change', () => {
	test('only components with breakpoint styles or per-breakpoint props render again', () => {
		const { styled, Provider } = createStitches({ media: { md: '(min-width: 600px)' } })
		const renders: Record<string, number> = { plain: 0, block: 0, prop: 0 }

		const counting = (name: string) => (props: { style?: unknown }) => {
			renders[name]++
			return React.createElement('View', props)
		}

		const Plain = styled(counting('plain'), { padding: 1, variants: { size: { l: { padding: 3 } } } })
		const Block = styled(counting('block'), { 'padding': 1, '@md': { padding: 2 } })
		const Prop = styled(counting('prop'), { padding: 1, variants: { size: { l: { padding: 3 } } } })

		// created once, so a Provider update reaches them only through context
		const children = [React.createElement(Plain, { key: 'plain', size: 'l' }), React.createElement(Block, { key: 'block' }), React.createElement(Prop, { key: 'prop', size: { '@md': 'l' } })]
		const app = (width: number) => React.createElement(Provider, { viewport: { width, height: 800 } }, children)

		let tree: renderer.ReactTestRenderer | undefined
		renderer.act(() => {
			tree = renderer.create(app(400))
		})
		expect(renders).toEqual({ plain: 1, block: 1, prop: 1 })

		renderer.act(() => tree?.update(app(900)))
		expect(renders).toEqual({ plain: 1, block: 2, prop: 2 })
	})

	test('a css prop with a breakpoint follows the window too', () => {
		const { styled, Provider } = createStitches({ media: { md: '(min-width: 600px)' } })
		const Box = styled((props: { style?: unknown }) => React.createElement('View', props), { padding: 1 })

		const children = React.createElement(Box, { css: { '@md': { padding: 9 } } })
		const app = (width: number) => React.createElement(Provider, { viewport: { width, height: 800 } }, children)

		let tree: renderer.ReactTestRenderer | undefined
		renderer.act(() => {
			tree = renderer.create(app(400))
		})
		renderer.act(() => tree?.update(app(900)))

		expect(tree?.toJSON()).toEqual(expect.objectContaining({ props: { style: { padding: 9 } } }))
	})

	test('a theme change still re-renders everything that resolves tokens', () => {
		const { styled, Provider, createTheme, theme } = createStitches({ theme: { colors: { text: 'black' } } })
		const dark = createTheme({ colors: { text: 'white' } })
		let renders = 0

		const Text = styled(
			(props: { style?: unknown }) => {
				renders++
				return React.createElement('Text', props)
			},
			{ color: '$text' },
		)

		const children = React.createElement(Text)
		let tree: renderer.ReactTestRenderer | undefined
		renderer.act(() => {
			tree = renderer.create(React.createElement(Provider, { theme }, children))
		})
		renderer.act(() => tree?.update(React.createElement(Provider, { theme: dark }, children)))

		expect(renders).toBe(2)
		expect(tree?.toJSON()).toEqual(expect.objectContaining({ props: { style: { color: 'white' } } }))
	})
})
