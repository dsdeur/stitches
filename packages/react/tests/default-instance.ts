import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createStitches, createTheme, css, globalCss, keyframes, styled } from '../src/index.ts'

// `styled` exported from the package root uses one shared instance with the default config.
describe('the default instance', () => {
	test('styled renders and writes to the shared sheet', () => {
		const Button = styled('button', { color: 'red', variants: { size: { lg: { fontSize: 16 } } } })

		// createStitches() with the default config is that same instance (and resets it)
		const shared = createStitches()

		const markup = renderToStaticMarkup(React.createElement(Button, { size: 'lg' }, 'Go'))

		expect(markup).toMatch(/^<button class="c-\w+ c-\w+-\w+-size-lg">Go<\/button>$/)
		expect(shared.getCssText()).toContain('{color:red}')
		expect(shared.getCssText()).toContain('{font-size:16px}')
	})

	test('css, globalCss, keyframes and createTheme from the react package share that instance', () => {
		const shared = createStitches()
		const box = css({ margin: 1 })
		const pulse = keyframes({ to: { opacity: 0 } })

		// a keyframes rule is written when it is used, the way a style naming it would
		const pulseName = String(pulse)
		box()
		globalCss({ html: { margin: 0 } })()
		String(createTheme('react-named', { colors: { brand: 'tomato' } }))
		String(createTheme({ colors: { brand: 'teal' } }))

		const cssText = shared.getCssText()
		expect(cssText).toContain('{margin:1px}')
		expect(cssText).toContain(`@keyframes ${pulseName}{to{opacity:0}}`)
		expect(cssText).toContain('html{margin:0}')
		expect(cssText).toContain('.react-named{--colors-brand:tomato}')
		expect(cssText).toMatch(/\.t-\w+\{--colors-brand:teal\}/)
	})
})
