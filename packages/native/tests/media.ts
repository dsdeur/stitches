import { toMediaTest } from '../src/index.ts'

const phone = { width: 390, height: 844 }
const tablet = { width: 820, height: 1180 }
const desktop = { width: 1440, height: 900 }

const matching = (query: string): string[] =>
	Object.entries({ phone, tablet, desktop })
		.filter(([, viewport]) => toMediaTest(query)(viewport))
		.map(([name]) => name)

describe('media queries read against a window size', () => {
	test('min- and max- width are inclusive, as in css', () => {
		expect(matching('(min-width: 820px)')).toEqual(['tablet', 'desktop'])
		expect(matching('(max-width: 820px)')).toEqual(['phone', 'tablet'])
	})

	test('height, em and rem', () => {
		expect(matching('(min-height: 1000px)')).toEqual(['tablet'])
		expect(matching('(min-width: 50em)')).toEqual(['tablet', 'desktop'])
		expect(matching('(max-width: 30rem)')).toEqual(['phone'])
	})

	test('range syntax, from either side and with two bounds', () => {
		expect(matching('(width >= 820px)')).toEqual(['tablet', 'desktop'])
		expect(matching('(820px > width)')).toEqual(['phone'])
		expect(matching('(400px < width <= 820px)')).toEqual(['tablet'])
	})

	test('and, commas, media types and orientation', () => {
		expect(matching('screen and (min-width: 400px) and (orientation: landscape)')).toEqual(['desktop'])
		expect(matching('(max-width: 400px), (min-width: 1000px)')).toEqual(['phone', 'desktop'])
		expect(matching('only screen and (orientation: portrait)')).toEqual(['phone', 'tablet'])
		expect(matching('@media (min-width: 1000px)')).toEqual(['desktop'])
	})

	test('what a window size cannot answer never matches, rather than always', () => {
		expect(matching('(hover: hover)')).toEqual([])
		expect(matching('(prefers-color-scheme: dark)')).toEqual([])
		expect(matching('print')).toEqual([])
		expect(matching('not all and (min-width: 1px)')).toEqual([])
		expect(matching('(min-width: 10vw)')).toEqual([])
	})

	test('every range operator, from either side, and exact sizes', () => {
		expect(matching('(width > 820px)')).toEqual(['desktop'])
		expect(matching('(width < 820px)')).toEqual(['phone'])
		expect(matching('(width <= 820px)')).toEqual(['phone', 'tablet'])
		expect(matching('(width = 820px)')).toEqual(['tablet'])
		expect(matching('(820px = width)')).toEqual(['tablet'])
		expect(matching('(820px <= width)')).toEqual(['tablet', 'desktop'])
		expect(matching('(900px >= height)')).toEqual(['phone', 'desktop'])
		expect(matching('(width: 390px)')).toEqual(['phone'])
		expect(matching('(height: 900px)')).toEqual(['desktop'])
	})

	test('a range or feature it cannot read never matches', () => {
		expect(matching('(400px < depth)')).toEqual([])
		expect(matching('(width > wide)')).toEqual([])
		expect(matching('(wide < width)')).toEqual([])
		expect(matching('(width > 1px > 2px > 3px)')).toEqual([])
		expect(matching('(orientation: sideways)')).toEqual([])
		expect(matching('(min-depth: 2px)')).toEqual([])
		expect(matching('min-width: 2px')).toEqual([])
	})
})
