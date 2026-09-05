import { createStitches } from '../src/index.ts'

describe('Numeric time values', () => {
	test('numbers on time properties are emitted in milliseconds, not pixels', () => {
		const { css, toString } = createStitches()

		css({ animationDelay: 200, animationDuration: 1500, transitionDelay: 0, transitionDuration: 300, width: 300 })()

		const cssText = toString()

		for (const declaration of ['animation-delay:200ms', 'animation-duration:1500ms', 'transition-delay:0', 'transition-duration:300ms', 'width:300px']) {
			expect(cssText.includes(declaration)).toBe(true)
		}
		expect(cssText.includes('px;')).toBe(false)
	})
})
