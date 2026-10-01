import { createStitches } from '../src/index.ts'

describe('render memo', () => {
	const config = { root: null, media: { md: '(min-width: 768px)' } } as const
	const definition = { color: 'black', variants: { size: { lg: { fontSize: 16 } } } }

	test('a warm render returns the same classes as the first', () => {
		const { css } = createStitches(config)
		const component = css(definition)

		const first = component({ size: 'lg', className: 'extra' }).className
		expect(component({ size: 'lg', className: 'extra' }).className).toBe(first)
		expect(component({ size: { '@md': 'lg' } }).className).toBe(component({ size: { '@md': 'lg' } }).className)
	})

	test('after a reset the rules are written again, not assumed to be there', () => {
		const { css, getCssText } = createStitches(config)
		const component = css(definition)
		component({ size: 'lg' })
		component({ size: { '@md': 'lg' } })

		// the same config hands back the same instance, with an empty sheet
		const again = createStitches(config)
		expect(again.getCssText()).not.toContain('font-size')

		component({ size: 'lg' })
		component({ size: { '@md': 'lg' } })
		expect(getCssText()).toContain('{font-size:16px}')
		expect(getCssText()).toContain('@media (min-width: 768px){')
	})

	test('a plain value that reads like a responsive one is a different selection', () => {
		const { css } = createStitches(config)
		const component = css({ variants: { mode: { '{"@md":"a"}': { opacity: 0.5 }, a: { opacity: 1 } } } })

		const responsive = component({ mode: { '@md': 'a' } }).className
		const plain = component({ mode: '{"@md":"a"}' }).className

		expect(plain).not.toBe(responsive)
		expect(component({ mode: { '@md': 'a' } }).className).toBe(responsive)
	})
})
