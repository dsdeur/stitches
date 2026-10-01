import { createStitches } from '../src/index.ts'

// Both found by the randomized web/native differential check (docs/bench/browser-differential.mts):
// the same config and props resolved differently on React Native than in a browser.
describe('native resolves like the web', () => {
	test('a shorthand declared after a longhand wins, as later css declarations do', () => {
		const { css } = createStitches()

		// React Native lets paddingTop beat padding whatever the order, so the earlier longhand goes
		expect(css({ paddingTop: 10, variants: { flat: { true: { padding: 4 } } } })({ flat: true })).toEqual({ padding: 4 })
		expect(css({ borderTopLeftRadius: 9, borderRadius: 2 })()).toEqual({ borderRadius: 2 })
		expect(css({ marginVertical: 3, margin: 0 })()).toEqual({ margin: 0 })
	})

	test('a longhand declared after a shorthand stays, and React Native lets it win', () => {
		const { css } = createStitches()

		expect(css({ padding: 4, paddingTop: 10 })()).toEqual({ padding: 4, paddingTop: 10 })
	})

	test('values an extension adds to an inherited variant sort where the variant was first declared', () => {
		const { css } = createStitches()

		const base = css({ variants: { tone: { muted: { color: 'gray' } } } })
		// the extension's own base color is deeper than the variant, even the value it adds itself
		const extended = css(base, { color: 'black', variants: { tone: { loud: { color: 'red' } } } })

		expect(extended({ tone: 'loud' })).toEqual({ color: 'black' })
		expect(extended({ tone: 'muted' })).toEqual({ color: 'black' })
	})
})
