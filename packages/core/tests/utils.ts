import { createStitches } from '../src/index.ts'

describe('Utils', () => {
	test('Authors can define utilties applied to components', () => {
		const stitches = createStitches({
			utils: {
				bg: (value: string | number | boolean | null | undefined) => ({ backgroundColor: value }),
			},
		})

		const component = stitches.css({
			bg: 'red',
		})

		expect(stitches.toString()).toBe('')

		component.toString()

		expect(stitches.toString()).toBe(`--sxs{--sxs:2 c-bzwKCF}@media{.c-bzwKCF{background-color:red}}`)
	})
})
