/**
 * Randomized differential checks in a real browser. For each seed, random compositions with random
 * variant props are resolved three ways, and all three must agree on every compared property:
 *
 * - the web runtime with `cascade: 'declared'`, by what Chromium computes for each element;
 * - the web runtime with `atomic: true`, the same, rendered in reverse order;
 * - `@stitches/native`, by reading its style objects the way React Native resolves them.
 *
 *   yarn build && npx tsx docs/bench/browser-differential.mts            # the CI seeds
 *   SEED=1234 COUNT=200 npx tsx docs/bench/browser-differential.mts      # one seed, more cases
 *
 * The generator (packages/core/tests/helpers/random-styles.ts) keeps out the one documented
 * difference between atomic and declared: only one breakpoint (`md`) ever matches.
 */
import { chromium } from 'playwright'
import { createStitches as createNativeStitches } from '../../packages/native/src/index.ts'
import { createRandom, generateComponent, generateProps, media, type GeneratedComponent, type Props } from '../../packages/core/tests/helpers/random-styles.ts'

const globalBuild = new URL('../../packages/core/dist/index.global.js', import.meta.url).pathname
const viewport = { width: 1280, height: 720 }
const seeds = process.env.SEED ? [Number(process.env.SEED)] : [1, 2, 3, 4, 5]
const count = Number(process.env.COUNT ?? 30)

/** Computed style properties compared everywhere, in this order. */
const compared = ['color', 'background-color', 'opacity', 'font-weight', 'padding-top', 'padding-left', 'margin-top', 'margin-left', 'border-top-left-radius']

/** Runs in the page: builds each composition, renders every case, returns what the browser computed. */
const resolveInPage = `({ mode, media, components, cases, compared }) => {
	const { css } = stitches.createStitches(mode === 'atomic' ? { atomic: true, media } : { cascade: 'declared', media })
	const built = components.map((chain) => chain.slice(1).reduce((component, definition) => css(component, definition), css(chain[0])))
	const order = cases.map((_, index) => index)
	if (mode === 'atomic') order.reverse()

	const results = []
	for (const index of order) {
		const [componentIndex, props] = cases[index]
		const element = document.createElement('div')
		element.className = built[componentIndex](props).className
		document.body.appendChild(element)
		const computed = getComputedStyle(element)
		results[index] = compared.map((property) => computed.getPropertyValue(property)).join('|')
	}

	const empty = document.createElement('div')
	document.body.appendChild(empty)
	const defaults = compared.map((property) => getComputedStyle(empty).getPropertyValue(property))

	return JSON.stringify({ results, defaults })
}`

type NativeStyle = { readonly [property: string]: unknown }

const px = (value: unknown): string | undefined => (typeof value === 'number' ? `${value}px` : undefined)
const text = (value: unknown): string | undefined => (typeof value === 'number' || typeof value === 'string' ? String(value) : undefined)

/**
 * What React Native shows for each compared property: a specific property beats an axis one beats
 * the general one, whatever order they were written in.
 */
const toNativeResult = (style: NativeStyle, defaults: readonly string[]): string =>
	[
		text(style.color),
		text(style.backgroundColor),
		text(style.opacity),
		text(style.fontWeight),
		px(style.paddingTop ?? style.paddingVertical ?? style.padding),
		px(style.paddingLeft ?? style.paddingHorizontal ?? style.padding),
		px(style.marginTop ?? style.marginVertical ?? style.margin),
		px(style.marginLeft ?? style.marginHorizontal ?? style.margin),
		px(style.borderTopLeftRadius ?? style.borderRadius),
	]
		.map((value, index) => value ?? defaults[index])
		.join('|')

const browser = await chromium.launch()
const failures: string[] = []
let cases = 0

for (const seed of seeds) {
	const random = createRandom(seed)
	const components: GeneratedComponent[] = Array.from({ length: count }, () => generateComponent(random))
	const caseList: [number, Props][] = components.flatMap((component, index) => Array.from({ length: 12 }, (): [number, Props] => [index, generateProps(random, component)]))

	const resolve = async (mode: 'declared' | 'atomic') => {
		const page = await browser.newPage({ viewport })
		await page.setContent('<!doctype html><html><body></body></html>')
		await page.addScriptTag({ path: globalBuild })
		const raw = await page.evaluate(`(${resolveInPage})(${JSON.stringify({ mode, media, components: components.map((component) => component.chain), cases: caseList, compared })})`)
		await page.close()
		const parsed: { results: string[]; defaults: string[] } = JSON.parse(String(raw))
		return parsed
	}

	const declared = await resolve('declared')
	const atomic = await resolve('atomic')

	const native = createNativeStitches({ media })
	const nativeComponents = components.map(({ chain }) => chain.slice(1).reduce((component, definition) => native.css(component, definition), native.css(chain[0])))

	caseList.forEach(([componentIndex, props], index) => {
		cases++
		const nativeResult = toNativeResult(nativeComponents[componentIndex](props, undefined, viewport), declared.defaults)
		const report = (label: string, actual: string) =>
			failures.push(
				`seed ${seed}, case ${index}: ${label}\n    chain     ${JSON.stringify(components[componentIndex].chain)}\n    props     ${JSON.stringify(props)}\n    compared  ${compared.join('|')}\n    declared  ${declared.results[index]}\n    ${label.padEnd(9)} ${actual}`,
			)

		if (atomic.results[index] !== declared.results[index]) report('atomic', atomic.results[index])
		if (nativeResult !== declared.results[index]) report('native', nativeResult)
	})
}

await browser.close()

if (failures.length) {
	const byKind = (kind: string) => failures.filter((failure) => failure.split('\n')[0].endsWith(`: ${kind}`)).length
	console.log(`${failures.length} differences in ${cases} cases (seeds ${seeds.join(', ')}): atomic ${byKind('atomic')}, native ${byKind('native')}. The first five:\n`)
	for (const failure of failures.slice(0, Number(process.env.SHOW ?? 5))) console.log(failure, '\n')
	process.exit(1)
}

console.log(`atomic, declared and native agree on all ${cases} cases (seeds ${seeds.join(', ')}, ${compared.length} properties each)`)
