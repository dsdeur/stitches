import { createStitches } from '../src/index.ts'

describe('responsive values', () => {
	const { css } = createStitches({
		theme: { space: { 1: '4px', 2: '8px', 3: '16px' } },
		media: { tablet: '(min-width: 768px)', desktop: '(min-width: 1200px)' },
	})

	const phone = { width: 390, height: 844 }
	const tablet = { width: 820, height: 1180 }
	const desktop = { width: 1440, height: 900 }

	const box = css({
		'padding': '$1',
		'@tablet': { padding: '$2' },
		'@desktop': { padding: '$3' },
		'variants': {
			size: {
				small: { fontSize: 12, lineHeight: '16px' },
				large: { fontSize: 18 },
			},
			tone: { quiet: { color: 'gray' }, brand: { color: 'blue' } },
		},
		'compoundVariants': [{ size: 'large', tone: 'brand', css: { opacity: 0.9 } }],
		'defaultVariants': { size: 'small' },
	})

	test('a breakpoint block in a style applies over the properties beside it when it matches', () => {
		expect(box({}, undefined, phone)).toEqual({ padding: 4, fontSize: 12, lineHeight: 16 })
		expect(box({}, undefined, tablet)).toEqual({ padding: 8, fontSize: 12, lineHeight: 16 })
		// both match; the later one in config.media wins, whatever order the style wrote them in
		expect(css({ '@desktop': { padding: 3 }, '@tablet': { padding: 2 } })({}, undefined, desktop)).toEqual({ padding: 3 })
	})

	test('without a viewport only @initial applies, as on the web before any breakpoint matches', () => {
		expect(box()).toEqual({ padding: 4, fontSize: 12, lineHeight: 16 })
		expect(box({ size: { '@initial': 'large', '@tablet': 'small' } })).toEqual({ padding: 4, fontSize: 18 })
	})

	test('a variant prop per breakpoint', () => {
		const size = { '@initial': 'large', '@tablet': 'small' } as const

		expect(box({ size }, undefined, phone)).toEqual({ padding: 4, fontSize: 18 })
		expect(box({ size }, undefined, tablet)).toEqual({ padding: 8, fontSize: 12, lineHeight: 16 })
	})

	test('@initial defaults to the default variant, and every active value applies in breakpoint order', () => {
		// small is the default, so @initial is small; at tablet large applies over it and lineHeight survives,
		// because on the web both rules match and large does not set lineHeight
		expect(box({ size: { '@tablet': 'large' } }, undefined, tablet)).toEqual({ padding: 8, fontSize: 18, lineHeight: 16 })
		expect(box({ size: { '@desktop': 'small', '@tablet': 'large' } }, undefined, desktop)).toEqual({ padding: 16, fontSize: 12, lineHeight: 16 })
	})

	test('a compound variant applies while each of its values is active', () => {
		const props = { size: { '@tablet': 'large' }, tone: 'brand' } as const

		expect(box(props, undefined, phone)).toEqual({ padding: 4, fontSize: 12, lineHeight: 16, color: 'blue' })
		expect(box(props, undefined, tablet)).toEqual({ padding: 8, fontSize: 18, lineHeight: 16, color: 'blue', opacity: 0.9 })
	})

	test('a raw query works as a prop key and as a style block', () => {
		expect(box({ tone: { '@media (min-width: 1000px)': 'brand' } }, undefined, desktop)).toEqual({ padding: 16, fontSize: 12, lineHeight: 16, color: 'blue' })
		expect(css({ 'opacity': 1, '@media (orientation: landscape)': { opacity: 0.5 } })({}, undefined, desktop)).toEqual({ opacity: 0.5 })
	})

	test('a raw query in a prop matches nothing without a viewport, and the same query twice reads the same', () => {
		const props = { tone: { '@media (min-width: 1000px)': 'brand' } } as const

		expect(box(props).color).toBe(undefined)
		expect(box(props, undefined, desktop).color).toBe('blue')
		expect(box(props, undefined, desktop).color).toBe('blue')
		expect(box(props, undefined, phone).color).toBe(undefined)
	})

	test('alternating between window sizes gives the right style each time', () => {
		for (const viewport of [phone, desktop, phone, tablet, desktop, tablet]) {
			const expected = viewport === phone ? 4 : viewport === tablet ? 8 : 16
			expect(box({}, undefined, viewport).padding).toBe(expected)
		}
	})

	test('a responsive prop and a plain string that reads the same are different selections', () => {
		const odd = css({ variants: { mode: { '{"@initial":"a"}': { opacity: 0.5 }, 'a': { opacity: 1 } } } })

		expect(odd({ mode: { '@initial': 'a' } })).toEqual({ opacity: 1 })
		expect(odd({ mode: '{"@initial":"a"}' })).toEqual({ opacity: 0.5 })
		expect(odd({ mode: { '@initial': 'a' } })).toEqual({ opacity: 1 })
	})

	test('the same breakpoints give the same object, and a different breakpoint a different one', () => {
		const wide = { width: 1300, height: 900 }

		expect(box({ size: 'large' }, undefined, desktop)).toBe(box({ size: 'large' }, undefined, wide))
		expect(box({ size: 'large' }, undefined, desktop)).not.toBe(box({ size: 'large' }, undefined, tablet))
	})
})
