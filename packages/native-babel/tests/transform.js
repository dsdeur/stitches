// Plain JS, like the plugin: it drives @babel/core directly.
import { transformSync } from '@babel/core'
import stitchesNative from '../src/index.js'

/** Output with whitespace collapsed, so assertions read like the code. */
const flat = (code) => code.replace(/\s+/g, ' ')

/** The plugin's output for a source, with only JSX parsing enabled, so untouched JSX stays JSX. */
const compile = (source, options = {}) =>
	transformSync(source, {
		babelrc: false,
		configFile: false,
		parserOpts: { plugins: ['jsx'] },
		plugins: [[stitchesNative, options]],
	}).code

describe('@stitches/native-babel', () => {
	test('a styled component rendered in a component body becomes one styledElement call', () => {
		const code = compile(`
			const Card = styled(View, { padding: 4 })
			export const List = ({ big }) => <Card size={big ? 'l' : 's'} testID="card" accessible key="a">Hi {big}</Card>
		`)

		expect(code).toContain(`import { styledElement as _styledElement, useStitchesEnvironment } from "@stitches/native/react";`)
		// one hook at the top of the component, then the element as a call
		expect(flat(code)).toContain(`=> { const _stitches = useStitchesEnvironment(); return _styledElement(Card, { size: big ? 'l' : 's', testID: "card", accessible: true }, "a", _stitches, "Hi ", big); }`)
		expect(code.split('import {').length).toBe(2)
	})

	test('inside a .map() callback in a component body it is rewritten too, with spread props', () => {
		const code = compile(`
			import { View } from 'react-native'
			const Row = styled(View, {})
			function Rows({ items }) {
				return <View>{items.map((item) => <Row {...item} key={item.id} />)}</View>
			}
		`)

		expect(flat(code)).toContain('const _stitches = useStitchesEnvironment(); return <View>{items.map(item => _styledElement(Row, { ...item }, item.id, _stitches))}</View>')
		// View is not a styled component, so it stays JSX
		expect(code).toContain('<View>')
	})

	test('through memo() and forwardRef(), and in a default-exported component', () => {
		const code = compile(`
			const Box = styled(View, {})
			const A = memo(() => <Box />)
			const B = React.forwardRef((props, ref) => <Box ref={ref} />)
			export default function () { return <Box /> }
		`)

		expect(code.split('_styledElement(Box').length - 1).toBe(3)
	})

	test('imports count as styled components when their source is listed, by name or pattern', () => {
		const source = `
			import { Card } from '@my/ui'
			import { Badge } from './components/badge'
			import { Other } from 'somewhere-else'
			const Screen = () => <><Card /><Badge /><Other /></>
		`

		const code = compile(source, { sources: ['@my/ui', /\/components\//] })

		// inside a fragment, each call sits in braces
		expect(flat(code)).toContain('return <>{_styledElement(Card, {}, undefined, _stitches)}{_styledElement(Badge, {}, undefined, _stitches)}<Other /></>')
	})

	test('JSX that may run outside a render is left alone', () => {
		const code = compile(`
			const Card = styled(View, {})
			const atModuleScope = <Card />
			const Screen = () => {
				const onPress = () => show(<Card />)
				const memoized = useMemo(() => <Card />, [])
				return <Pressable onPress={onPress}>{memoized}</Pressable>
			}
			function helper() { return <Card /> }
		`)

		expect(code).not.toContain('_styledElement')
		expect(code).not.toContain('import')
	})

	test('an element that might mount under another theme than where it is created is left alone', () => {
		const code = compile(`
			import { Provider, Section } from './elsewhere'
			const Card = styled(View, {})
			const InProvider = () => <Provider theme={dark}><Card /></Provider>
			const InComponent = () => <Section><Card /></Section>
			const AsProp = () => <Section header={<Card />} />
			const InVariable = () => {
				const card = <Card />
				return card
			}
			const AsCondition = () => (<Card /> ? null : null)
		`)

		expect(code).not.toContain('_styledElement')
	})

	test('inside host elements, fragments, conditionals and other styled elements it is rewritten', () => {
		const code = compile(`
			import { ScrollView } from 'react-native'
			const Card = styled(View, {})
			const Inner = styled(View, {})
			const Screen = ({ show, items }) => (
				<ScrollView>
					<view>{show ? <Card key="a" /> : null}</view>
					<>{show && <Card key="b" />}</>
					<Card key="c"><Inner /></Card>
					{[<Card key="d" />, ...items.map((item) => { return <Card key={item} /> })]}
				</ScrollView>
			)
		`)

		expect(code.split('_styledElement(Card').length - 1).toBe(5)
		expect(code.split('_styledElement(Inner').length - 1).toBe(1)
	})

	test('host elements, unknown bindings and namespaced attributes are left alone', () => {
		const code = compile(`
			const Card = styled(View, {})
			const Screen = () => <>
				<view />
				<Missing />
				<Card xlink:href="#a" />
			</>
		`)

		expect(code).not.toContain('_styledElement')
	})

	test('the hook keeps a use… name React Compiler recognises, even when the file already has the plain name', () => {
		const code = compile(`
			const useStitchesEnvironment = () => null
			const Card = styled(View, {})
			const A = () => <Card />
		`)

		expect(code).toContain('useStitchesEnvironment as useStitchesEnvironment2')
		expect(flat(code)).toContain('const _stitches = useStitchesEnvironment2();')
	})

	test('several elements in one component share one hook call', () => {
		const code = compile(`
			const Card = styled(View, {})
			function A({ items }) {
				if (items.length === 0) return <Card />
				return <>{items.map((item) => <Card key={item} />)}<Card /></>
			}
		`)

		expect(code.split('useStitchesEnvironment()').length - 1).toBe(1)
		expect(code.split('_styledElement(Card').length - 1).toBe(3)
	})

	test('a configured styled name is recognised', () => {
		const code = compile(
			`
			const Card = makeStyled(View, {})
			const Screen = () => <Card />
		`,
			{ styledNames: ['makeStyled'], runtime: 'my-runtime' },
		)

		expect(code).toContain(`import { styledElement as _styledElement, useStitchesEnvironment } from "my-runtime";`)
		expect(flat(code)).toContain('return _styledElement(Card, {}, undefined, _stitches)')
	})
})
