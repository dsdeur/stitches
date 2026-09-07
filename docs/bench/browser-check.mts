/**
 * Real-browser verification of the two things a node test cannot reach:
 * the live CSSOM (rules are inserted at computed positions inside grouping rules) and what the
 * browser actually resolves for an element. Node tests use a mock sheet, so a mistake in how we
 * talk to a real stylesheet would not show up there.
 *
 *   yarn build && yarn test:browser
 *
 * Exits non-zero on the first mismatch.
 */
import { chromium } from 'playwright'
import { createStitches } from '../../packages/core/src/index.ts'

const globalBuild = new URL('../../packages/core/dist/index.global.js', import.meta.url).pathname

type Case = {
	name: string
	/** Runs in the browser against the global build; returns whatever the check needs. */
	run: (cascade: 'legacy' | 'declared') => unknown
	expected: Record<'legacy' | 'declared', unknown>
}

/** Declaration order must beat render order, and the browser must agree, not just the sheet text. */
const orderCase = `(cascade) => {
	const { css, getCssText } = stitches.createStitches({ cascade })
	const parent = css({ color: 'rgb(0, 0, 0)', variants: { tone: { muted: { color: 'rgb(1, 1, 1)' } } }, defaultVariants: { tone: 'muted' } })
	const child = css(parent, { color: 'rgb(2, 2, 2)' })

	// render the parent first, so render order and declaration order disagree
	parent()
	const element = document.createElement('div')
	element.className = child().className
	document.body.appendChild(element)

	return getComputedStyle(element).color
}`

/** Rules rendered in reverse order must still resolve in declaration order. */
const reverseCase = `(cascade) => {
	const { css } = stitches.createStitches({ cascade })
	const component = css({ variants: { first: { on: { color: 'rgb(3, 3, 3)' } }, second: { on: { color: 'rgb(4, 4, 4)' } } } })

	component({ second: 'on' })
	const element = document.createElement('div')
	element.className = component({ first: 'on', second: 'on' }).className
	document.body.appendChild(element)

	return getComputedStyle(element).color
}`

/** getCssText() must not depend on how the browser re-serializes what it parsed. */
const textCase = `(cascade) => {
	const { css, getCssText } = stitches.createStitches({ cascade, theme: { space: { 1: '12px' } } })
	css({ padding: '$1', paddingBottom: 0, all: 'unset', variants: { size: { lg: { fontSize: 16 } } } })({ size: 'lg' })
	return getCssText()
}`

const nodeText = (cascade: 'legacy' | 'declared') => {
	const { css, getCssText } = createStitches({ cascade, theme: { space: { 1: '12px' } }, root: null })
	css({ padding: '$1', paddingBottom: 0, all: 'unset', variants: { size: { lg: { fontSize: 16 } } } })({ size: 'lg' })
	return getCssText()
}

const browser = await chromium.launch()
const failures: string[] = []
let checked = 0

for (const cascade of ['legacy', 'declared'] as const) {
	// A fresh page per check: an instance rooted at the document hydrates whatever markers a
	// previous instance left in it, which is a different scenario from a first render.
	const check = async (name: string, source: string, expected: unknown) => {
		const page = await browser.newPage()
		await page.setContent('<!doctype html><html><body></body></html>')
		await page.addScriptTag({ path: globalBuild })

		const actual = await page.evaluate(`(${source})(${JSON.stringify(cascade)})`)
		await page.close()

		checked++
		if (actual === expected) {
			console.log(`  ok   ${cascade}: ${name}`)
		} else {
			failures.push(`${cascade}: ${name}\n    expected ${JSON.stringify(expected)}\n    actual   ${JSON.stringify(actual)}`)
			console.log(`  FAIL ${cascade}: ${name}`)
		}
	}

	console.log(`cascade '${cascade}'`)
	// legacy resolves by render order, so the parent's variant wins; declared resolves by depth
	await check('an extension beats the parent variant', orderCase, cascade === 'declared' ? 'rgb(2, 2, 2)' : 'rgb(1, 1, 1)')
	await check('reverse render order still resolves by declaration', reverseCase, cascade === 'declared' ? 'rgb(4, 4, 4)' : 'rgb(3, 3, 3)')
	await check('getCssText() in the browser equals the server output', textCase, nodeText(cascade))
}

await browser.close()

if (failures.length) {
	console.log(`\n${failures.length} of ${checked} checks failed:\n`)
	for (const failure of failures) console.log(failure)
	process.exit(1)
}

console.log(`\nall ${checked} checks passed`)
