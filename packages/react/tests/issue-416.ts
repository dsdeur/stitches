import * as React from 'react'
import * as renderer from 'react-test-renderer'
import { createStitches } from '../src/index.ts'

describe('Issue #416: Composition versus Descendancy', () => {
	{
		const { styled, getCssText } = createStitches()

		const BoxA = styled('main', {
			variants: {
				foo: {
					bar: {
						'--box-a': 'foo-bar',
					},
				},
			},
		})

		const BoxB = styled(BoxA, {
			variants: {
				foo: {
					bar: {
						'--box-b': 'foo-bar',
					},
				},
			},
		})

		const GenY = (props: Record<string, unknown>) => {
			return React.createElement(BoxB, props)
		}

		const BoxZ = styled(GenY, {
			variants: {
				foo: {
					bar: {
						'--box-z': 'foo-bar',
					},
				},
			},
		})

		const App = () => {
			return React.createElement(
				'div',
				null,
				// children
				React.createElement(BoxA, { foo: 'bar' }),
				React.createElement(BoxB, { foo: 'bar' }),
				React.createElement(GenY, { foo: 'bar' }),
				React.createElement(BoxZ, { foo: 'bar' }),
			)
		}

		// Rendered while the suite is collected, because the assertions below read the result at that time.
		let wrapper: renderer.ReactTestRenderer | undefined
		renderer.act(() => {
			wrapper = renderer.create(React.createElement(App))
		})
		test('it can render without errors', () => {
			expect(wrapper).not.toBe(undefined)
		})

		if (wrapper === undefined) throw new Error('wrapper is undefined')
		const json = wrapper.toJSON()
		if (json === null || Array.isArray(json) || json.children === null) throw new Error('Unexpected JSON structure')
		const [boxA, boxB, genY, boxZ] = json.children

		const isRenderedJSON = (node: renderer.ReactTestRendererJSON | string): node is renderer.ReactTestRendererJSON => typeof node !== 'string'

		const baselineClass = `c-PJLV`
		const variantAClass = `c-PJLV-kgptgY-foo-bar`
		const variantBClass = `c-PJLV-cHNUhn-foo-bar`
		const variantZClass = `c-PJLV-vFFMz-foo-bar`

		test('Box A has an active variant', () => {
			if (!isRenderedJSON(boxA)) throw new Error('boxA is a string')
			expect(boxA.props.className).toBe(`${baselineClass} ${variantAClass}`)
		})

		test('Box B has an active variant, plus the active variant of Box A', () => {
			if (!isRenderedJSON(boxB)) throw new Error('boxB is a string')
			expect(boxB.props.className).toBe(`${baselineClass} ${variantAClass} ${variantBClass}`)
		})

		test('Gen Y has no variant, but activates the variants of Box A and Box B', () => {
			if (!isRenderedJSON(genY)) throw new Error('genY is a string')
			expect(genY.props.className).toBe(`${baselineClass} ${variantAClass} ${variantBClass}`)
		})

		test('Box Z has an active variant, but does not activate the variants of Box A or Box B', () => {
			if (!isRenderedJSON(boxZ)) throw new Error('boxZ is a string')
			expect(boxZ.props.className).toBe(`${baselineClass} ${variantZClass}`)
		})

		test('All variant CSS is generated', () =>
			expect(getCssText()).toBe(
				`--sxs{--sxs:3 c-PJLV-kgptgY-foo-bar c-PJLV-cHNUhn-foo-bar c-PJLV-vFFMz-foo-bar}@media{` + `.c-PJLV-kgptgY-foo-bar{--box-a:foo-bar}` + `.c-PJLV-cHNUhn-foo-bar{--box-b:foo-bar}` + `.c-PJLV-vFFMz-foo-bar{--box-z:foo-bar}` + `}`,
			))
	}
})
