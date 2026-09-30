import * as React from 'react'
import * as renderer from 'react-test-renderer'
import { createStitches } from '../src/react/index.ts'

// Stand-ins for react-native's primitives: they render a host element carrying their props, which
// is all a styled component can see of View or Text anyway.
const View = React.forwardRef<{ focus: () => void }, { style?: unknown; testID?: string; children?: React.ReactNode }>((props, ref) => {
	React.useImperativeHandle(ref, () => ({ focus: () => undefined }))
	return React.createElement('View', props)
})
const Text = (props: { style?: unknown; children?: React.ReactNode }) => React.createElement('Text', props)

const config = {
	theme: {
		colors: { background: 'white', text: 'black' },
		space: { 1: '4px', 2: '8px' },
	},
	media: { tablet: '(min-width: 768px)' },
}

/** Renders an element and returns the host element's props. */
const hostProps = (element: React.ReactElement): Record<string, unknown> => {
	let tree: renderer.ReactTestRenderer | undefined

	renderer.act(() => {
		tree = renderer.create(element)
	})

	const json = tree?.toJSON()

	if (!json || Array.isArray(json)) throw new Error('expected one host element')

	return json.props
}

describe('styled for React Native', () => {
	const { styled, Provider, createTheme, useTheme } = createStitches(config)

	const Card = styled(View, {
		padding: '$1',
		backgroundColor: '$background',
		variants: {
			size: { large: { padding: '$2' } },
			raised: { true: { shadowOpacity: 0.2 } },
		},
	})

	test('puts the resolved style in the style prop and forwards everything else', () => {
		expect(hostProps(React.createElement(Card, { size: 'large', testID: 'card' }))).toEqual({
			testID: 'card',
			style: { padding: 8, backgroundColor: 'white' },
		})
	})

	test('a style passed in comes after the resolved one, so it still wins', () => {
		expect(hostProps(React.createElement(Card, { style: { padding: 0 } })).style).toEqual([{ padding: 4, backgroundColor: 'white' }, { padding: 0 }])
	})

	test('the css prop is applied last of everything', () => {
		expect(hostProps(React.createElement(Card, { size: 'large', css: { padding: '$1' } })).style).toEqual({ padding: 4, backgroundColor: 'white' })
	})

	test('the provider sets the theme, and a nested one inherits what it does not set', () => {
		const dark = createTheme({ colors: { background: 'black' } })

		const element = React.createElement(Provider, { theme: dark }, React.createElement(Provider, { viewport: { width: 1000, height: 800 } }, React.createElement(Card)))

		expect(hostProps(element).style).toEqual({ padding: 4, backgroundColor: 'black' })
	})

	test('responsive variants follow the viewport the provider was given', () => {
		const element = (width: number) => React.createElement(Provider, { viewport: { width, height: 800 } }, React.createElement(Card, { size: { '@tablet': 'large' } }))

		expect(hostProps(element(400)).style).toEqual({ padding: 4, backgroundColor: 'white' })
		expect(hostProps(element(800)).style).toEqual({ padding: 8, backgroundColor: 'white' })
	})

	test('extending a styled component keeps its variants and what it wraps, and the extension wins', () => {
		const Highlighted = styled(Card, { backgroundColor: '$text', variants: { size: { large: { padding: 12 } } } })

		const props = hostProps(React.createElement(Highlighted, { size: 'large', raised: true }))

		expect(props.style).toEqual({ padding: 12, backgroundColor: 'black', shadowOpacity: 0.2 })
		expect(Highlighted.displayName).toBe(Card.displayName)
	})

	test('a ref reaches the wrapped component, and no ref prop is invented without one', () => {
		const ref = React.createRef<{ focus: () => void }>()

		hostProps(React.createElement(Card, { ref }))

		expect(typeof ref.current?.focus).toBe('function')
		expect('ref' in hostProps(React.createElement(Card))).toBe(false)
	})

	test('as renders another component with the same style', () => {
		let tree: renderer.ReactTestRenderer | undefined

		renderer.act(() => {
			tree = renderer.create(React.createElement(Card, { as: Text, size: 'large' }))
		})

		expect(tree?.toJSON()).toEqual(expect.objectContaining({ type: 'Text', props: { style: { padding: 8, backgroundColor: 'white' } } }))
	})

	test('useTheme reads the nearest provider', () => {
		const dark = createTheme({ colors: { text: 'white' } })
		let seen: unknown

		const Probe = () => {
			seen = useTheme().colors?.text
			return null
		}

		renderer.act(() => {
			renderer.create(React.createElement(Provider, { theme: dark }, React.createElement(Probe)))
		})

		expect(seen).toBe('white')
	})

	test('the style function behind a component gives the same style without rendering', () => {
		expect(Card.style({ raised: true })).toEqual({ padding: 4, backgroundColor: 'white', shadowOpacity: 0.2 })
	})
})
