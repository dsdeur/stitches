import { createStitches } from '../src/index.ts'

describe('Default theme map: color properties', () => {
	test('accentColor and logical border color properties resolve bare tokens from the colors scale', () => {
		const { css, toString } = createStitches({ theme: { colors: { red: 'tomato' } } })

		css({
			accentColor: '$red',
			borderBlockColor: '$red',
			borderBlockStartColor: '$red',
			borderBlockEndColor: '$red',
			borderInlineColor: '$red',
			borderInlineStartColor: '$red',
			borderInlineEndColor: '$red',
		})()

		const cssText = toString()

		for (const property of ['accent-color', 'border-block-color', 'border-block-start-color', 'border-block-end-color', 'border-inline-color', 'border-inline-start-color', 'border-inline-end-color']) {
			expect(cssText.includes(`${property}:var(--colors-red)`)).toBe(true)
		}
	})
})
