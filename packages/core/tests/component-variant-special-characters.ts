import { createStitches } from '../src/index.ts'

describe('Variant values with characters that are not valid in a CSS identifier', () => {
	test('a dot in a variant value is escaped in the selector but not in the class attribute', () => {
		const { css, toString } = createStitches()

		const component = css({ variants: { size: { '1.5': { padding: 6 } } } })

		expect(component({ size: '1.5' }).className).toBe('c-PJLV c-PJLV-hTqPxc-size-1.5')
		expect(toString()).toBe('--sxs{--sxs:3 c-PJLV-hTqPxc-size-1.5}@media{.c-PJLV-hTqPxc-size-1\\.5{padding:6px}}')
	})

	test('other non-identifier characters are escaped as well', () => {
		const { css, toString } = createStitches()

		const component = css({ variants: { width: { '50%': { width: '50%' }, 'a/b': { order: 1 } } } })

		component({ width: '50%' })
		component({ width: 'a/b' })

		expect(/\.c-PJLV-\w+-width-50\\%\{width:50%\}/.test(toString())).toBe(true)
		expect(/\.c-PJLV-\w+-width-a\\\/b\{order:1\}/.test(toString())).toBe(true)
	})

	test('a displayName with a dot yields an escaped selector', () => {
		const { css } = createStitches()

		const component = css.withConfig({ displayName: 'Nav.Item' })({ color: 'red' })

		expect(component.className.startsWith('c-Nav.Item-')).toBe(true)
		expect(component.selector.startsWith('.c-Nav\\.Item-')).toBe(true)
	})
})
