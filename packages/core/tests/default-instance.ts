import { createStitches, createTheme, css, globalCss, keyframes } from '../src/index.ts'

// The functions exported from the package root use one shared instance, created on first use with
// the default config. They are public API, and coverage showed nothing exercised them.
describe('the default instance', () => {
	test('css, globalCss, keyframes and createTheme write to one shared sheet', () => {
		const button = css({ color: 'red' })
		const fadeIn = keyframes({ from: { opacity: 0 } })
		const reset = globalCss({ body: { margin: 0 } })
		const named = createTheme('named', { colors: { brand: 'tomato' } })
		const hashed = createTheme({ colors: { brand: 'teal' } })

		// createStitches() with the default config is that same instance (it resets it on the way)
		const shared = createStitches()

		expect(button().className).toBe('c-gmqXFB')
		expect(String(fadeIn)).toMatch(/^k-\w+$/)
		expect(reset()).toBe('')
		expect(String(named)).toBe('named')
		expect(String(hashed)).toMatch(/^t-\w+$/)

		const cssText = shared.getCssText()
		expect(cssText).toContain('.c-gmqXFB{color:red}')
		expect(cssText).toContain(`@keyframes ${fadeIn.name}{from{opacity:0}}`)
		expect(cssText).toContain('body{margin:0}')
		expect(cssText).toContain('.named{--colors-brand:tomato}')
	})
})
