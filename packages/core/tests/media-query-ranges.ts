import { createStitches } from '../src/index.ts'

describe('media query range syntax', () => {
	test('ranges become min/max features, exclusive bounds nudged by 1/16px', () => {
		const { css, getCssText } = createStitches({ root: null, media: { r: '(400px < width <= 800px)', e: '(width = 500px)', g: '(width >= 1024px)' } })

		css({ '@r': { color: 'red' }, '@e': { color: 'blue' }, '@g': { color: 'green' }, '@media (300px <= height < 600px)': { color: 'teal' } })()

		const cssText = getCssText()
		expect(cssText).toContain('@media (min-width:400.0625px) and (max-width:800px){')
		expect(cssText).toContain('@media (width:500px){')
		expect(cssText).toContain('@media (min-width:1024px){')
		expect(cssText).toContain('@media (min-height:300px) and (max-height:599.9375px){')
	})
})
