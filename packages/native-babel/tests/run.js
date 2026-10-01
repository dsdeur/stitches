// Plain JS: compiles a module with the plugin, writes it next to the tests and imports it, so what is
// checked is the compiled code actually running against @stitches/native.
import { transformSync } from '@babel/core'
import { mkdirSync, writeFileSync } from 'node:fs'
import * as React from 'react'
import * as renderer from 'react-test-renderer'
import stitchesNative from '../src/index.js'

const runtime = new URL('../../native/src/react/index.ts', import.meta.url).pathname

// JSX is used only for the styled components, which the plugin compiles away; everything else is
// React.createElement, so the output runs without a JSX transform.
const source = `
import * as React from 'react'
import { createStitches } from ${JSON.stringify(runtime)}

export const { styled, Provider, createTheme, theme } = createStitches({
	theme: { colors: { text: 'black' } },
	media: { md: '(min-width: 600px)' },
})

const View = (props) => React.createElement('View', props)

export const Card = styled(View, { color: '$text', padding: 1, '@md': { padding: 2 }, variants: { size: { l: { padding: 3 } } } })
export const Plain = styled(View, { margin: 1 })

// The screen returns its styled elements (an array, so no JSX remains for a JSX transform to do).
function Screen({ items }) {
	return [items.map((item) => <Card key={item} size={item === 'b' ? 'l' : undefined} testID={item}>{item}</Card>), <Plain key="plain" testID="plain" />]
}

export function App({ items, width, activeTheme }) {
	return React.createElement(Provider, { viewport: { width, height: 800 }, theme: activeTheme }, React.createElement(Screen, { items }))
}

/** The same tree, uncompiled: what JSX would have made without the plugin. */
function ReferenceScreen({ items }) {
	return [items.map((item) => React.createElement(Card, { key: item, size: item === 'b' ? 'l' : undefined, testID: item }, item)), React.createElement(Plain, { key: 'plain', testID: 'plain' })]
}

export function Reference({ items, width, activeTheme }) {
	return React.createElement(Provider, { viewport: { width, height: 800 }, theme: activeTheme }, React.createElement(ReferenceScreen, { items }))
}
`

// `runtime` must be the same module the components come from: styledElement finds styled components
// in a registry of that module. In an app both are @stitches/native/react, the default.
const compiled = transformSync(source, { babelrc: false, configFile: false, parserOpts: { plugins: ['jsx'] }, plugins: [[stitchesNative, { runtime }]] }).code

const directory = new URL('./.generated/', import.meta.url)
mkdirSync(directory, { recursive: true })
const file = new URL('app.mjs', directory)
writeFileSync(file, compiled)

const { App, Reference, Card, Plain, createTheme, theme } = await import(file.href)

const render = (Component, props) => {
	let tree
	renderer.act(() => {
		tree = renderer.create(React.createElement(Component, props))
	})
	return tree
}

describe('compiled styled components', () => {
	const items = ['a', 'b', 'c']

	test('the compiled module calls styledElement, not the components', () => {
		expect(compiled).toContain('_styledElement(Card,')
		expect(compiled).toContain('_styledElement(Plain,')
	})

	test('render the same host tree as the uncompiled code', () => {
		const props = { items, width: 400, activeTheme: theme }

		expect(render(App, props).toJSON()).toEqual(render(Reference, props).toJSON())
	})

	test('leave no component of their own in the tree', () => {
		const props = { items, width: 400, activeTheme: theme }
		const count = (tree) => tree.root.findAll((node) => node.type === Card || node.type === Plain).length

		expect(count(render(Reference, props))).toBe(4)
		expect(count(render(App, props))).toBe(0)
	})

	test('still follow a theme change and a window change', () => {
		const dark = createTheme({ colors: { text: 'white' } })
		let tree
		renderer.act(() => {
			tree = renderer.create(React.createElement(App, { items, width: 400, activeTheme: theme }))
		})
		renderer.act(() => tree.update(React.createElement(App, { items, width: 900, activeTheme: dark })))

		let reference
		renderer.act(() => {
			reference = renderer.create(React.createElement(Reference, { items, width: 900, activeTheme: dark }))
		})

		expect(tree.toJSON()).toEqual(reference.toJSON())
		expect(JSON.stringify(tree.toJSON())).toContain('"color":"white"')
		expect(JSON.stringify(tree.toJSON())).toContain('"padding":2')
	})
})
