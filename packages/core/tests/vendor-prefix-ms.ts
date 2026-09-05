import { createStitches } from '../src/index.ts'

describe('Vendor prefixes in camelCase properties', () => {
	test('ms-prefixed properties get a leading dash like Webkit and Moz do', () => {
		const { css, toString } = createStitches()

		css({ msOverflowStyle: 'none', WebkitBackgroundClip: 'text', MozAppearance: 'none' })()

		expect(toString()).toBe('--sxs{--sxs:2 c-kMzvOz}@media{.c-kMzvOz{-ms-overflow-style:none;-webkit-background-clip:text;-moz-appearance:none}}')
	})
})
