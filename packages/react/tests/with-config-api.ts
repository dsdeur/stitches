import * as React from 'react'
import type { ReactElement } from 'react'
import * as renderer from 'react-test-renderer'
import type { ReactTestRendererJSON } from 'react-test-renderer'
import { createStitches } from '../src/index.ts'

function render(component: { render?: (props?: Record<string, unknown>, ref?: unknown) => ReactElement | null }, props?: Record<string, unknown>): ReactElement {
	if (!component.render) throw new Error('render is undefined')
	const result = component.render(props)
	if (result === null) throw new Error('render returned null')
	return result
}

function toJSON(r: renderer.ReactTestRenderer): ReactTestRendererJSON {
	const json = r.toJSON()
	if (json === null || Array.isArray(json)) throw new Error('unexpected toJSON result')
	return json
}

describe('styled.withConfig', () => {
	test('Basic css calls without a config', () => {
		const { styled, getCssText } = createStitches()

		const ComponentToRender = styled.withConfig()('button', { color: 'DodgerBlue' })
		const className = render(ComponentToRender).props.className

		const cssString = getCssText()

		expect(className).toBe('c-dataoT')
		expect(cssString).toBe(`--sxs{--sxs:2 c-dataoT}@media{.c-dataoT{color:DodgerBlue}}`)
	})

	test('Creates the correct className with a componentId', () => {
		const { styled, getCssText } = createStitches()

		const componentConfig = {
			componentId: 'cool-id',
		}
		const ComponentToRender = styled.withConfig(componentConfig)('button', { color: 'red' })
		const className = render(ComponentToRender).props.className

		const cssString = getCssText()

		expect(className).toBe('c-cool-id')
		expect(cssString).toBe(`--sxs{--sxs:2 c-cool-id}@media{.c-cool-id{color:red}}`)
	})

	test('Creates the correct className with a displayName', () => {
		const { styled, getCssText } = createStitches()

		const componentConfig = {
			displayName: 'my-cool-display-name',
		}
		const ComponentToRender = styled.withConfig(componentConfig)('button', { color: 'red' })
		const className = render(ComponentToRender).props.className

		const cssString = getCssText()

		expect(className).toBe('c-my-cool-display-name-gmqXFB')
		expect(cssString).toBe(`--sxs{--sxs:2 c-my-cool-display-name-gmqXFB}@media{.c-my-cool-display-name-gmqXFB{color:red}}`)
	})

	test('Creates the correct className with a displayName and componentId', () => {
		const { styled, getCssText } = createStitches()

		const componentConfig = {
			componentId: 'cool-id',
			displayName: 'my-cool-display-name',
		}
		const ComponentToRender = styled.withConfig(componentConfig)('button', { color: 'red' })
		const className = render(ComponentToRender).props.className

		const cssString = getCssText()

		expect(className).toBe('c-my-cool-display-name-cool-id')
		expect(cssString).toBe(`--sxs{--sxs:2 c-my-cool-display-name-cool-id}@media{.c-my-cool-display-name-cool-id{color:red}}`)
	})

	test('Sets displayName on the component when passed as a componentConfig', () => {
		const { styled } = createStitches()

		const componentConfig = {
			componentId: 'cool-id',
			displayName: 'my-cool-display-name',
		}
		const ComponentToRender = styled.withConfig(componentConfig)('button', { color: 'red' })
		expect(ComponentToRender.displayName).toBe(componentConfig.displayName)
	})

	test('Creates the correct className with a componentConfig while extending components', () => {
		const { styled, getCssText } = createStitches()

		const ComponentToExtend = styled.withConfig({
			componentId: 'component-to-extend-id',
		})({ color: 'red' })
		const ComponentToRender = styled.withConfig({ componentId: 'cool-component-id' })(ComponentToExtend, { color: 'blue' })

		const className = render(ComponentToRender).props.className

		const cssString = getCssText()

		expect(className).toBe('c-component-to-extend-id c-cool-component-id')
		expect(cssString).toBe(`--sxs{--sxs:2 c-component-to-extend-id c-cool-component-id}@media{.c-component-to-extend-id{color:red}.c-cool-component-id{color:blue}}`)
	})
})

describe('shouldForwardStitchesProp', () => {
	test('Forwards the variant to the underlying component when shouldForwardStitchesProp returns true', () => {
		const { styled } = createStitches()

		const ReactComponent = ({ isOpen }: { isOpen?: boolean }) => {
			return React.createElement('div', {}, isOpen ? 'open' : 'closed')
		}

		const componentOneConfig = {
			shouldForwardStitchesProp: () => true,
		}

		const StitchesComponent = styled.withConfig(componentOneConfig)(ReactComponent, {
			variants: {
				isOpen: {
					true: { background: 'red' },
					false: { background: 'blue' },
				},
			},
		})

		let Rendered: renderer.ReactTestRenderer | undefined
		renderer.act(() => {
			Rendered = renderer.create(React.createElement(StitchesComponent, { isOpen: true }))
		})

		if (Rendered === undefined) throw new Error('Rendered is undefined')
		expect(toJSON(Rendered).children?.[0]).toBe('open')
	})

	test('Does not render the underlying ReactComponent when an as prop is provided and shouldForwardStitchesProp returns false', () => {
		const { styled } = createStitches()

		const ReactComponent = ({ as: asProp }: { as?: string }) => {
			return React.createElement(asProp || 'button', {}, 'hola from child')
		}

		const componentOneConfig = {
			shouldForwardStitchesProp: () => false,
		}

		const StitchesComponent = styled.withConfig(componentOneConfig)(ReactComponent, {})

		let Rendered: renderer.ReactTestRenderer | undefined
		renderer.act(() => {
			Rendered = renderer.create(React.createElement(StitchesComponent, { as: 'a' }, ['comp']))
		})

		if (Rendered === undefined) throw new Error('Rendered is undefined')
		expect(toJSON(Rendered).children?.[0]).toBe('comp')
	})

	test('Forwards the as prop to the underlying component when shouldForwardStitchesProp returns true and the asp prop was defined', () => {
		const { styled } = createStitches()

		const ReactComponent = ({ as: asProp }: { as?: string }) => {
			return React.createElement('div', {}, asProp || 'no-as-prop-found')
		}

		const componentOneConfig = {
			shouldForwardStitchesProp: () => true,
		}
		const StitchesComponent = styled.withConfig(componentOneConfig)(ReactComponent, {})

		let Rendered: renderer.ReactTestRenderer | undefined
		renderer.act(() => {
			Rendered = renderer.create(React.createElement(StitchesComponent))
		})
		if (Rendered === undefined) throw new Error('Rendered is undefined')
		expect(toJSON(Rendered).children?.[0]).toBe('no-as-prop-found')

		renderer.act(() => {
			if (Rendered === undefined) throw new Error('Rendered is undefined')
			Rendered.update(React.createElement(StitchesComponent, { as: 'a' }))
		})
		expect(toJSON(Rendered).children?.[0]).toBe('a')
	})
})
