import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createStitches } from '../src/index.ts'

describe('atomic output with styled', () => {
	test('an extension overrides its base on the element itself, and keeps the base class for selectors', () => {
		const { styled, getCssText } = createStitches({ atomic: true, root: null })

		const Button = styled('button', { color: 'black', padding: 4, variants: { tone: { muted: { color: 'gray' } } }, defaultVariants: { tone: 'muted' } })
		const Danger = styled(Button, { color: 'red' })

		const markup = renderToStaticMarkup(React.createElement(Danger, null, 'Delete'))
		const classes = /class="([^"]*)"/.exec(markup)?.[1].split(' ') ?? []
		const atoms = classes.filter((name) => name.startsWith('a-'))

		expect(classes[0]).toBe(Button.className)
		expect(atoms.map((name) => new RegExp(`\\.${name}\\{([^}]*)\\}`).exec(getCssText())?.[1])).toEqual(['padding:4px', 'color:red'])
	})
})
