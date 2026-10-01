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
import { readFileSync } from 'node:fs'
import { createStitches } from '../../packages/core/src/index.ts'
import { bundleCss, extractCss } from '../../packages/static/src/index.ts'

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

/**
 * Static extraction: the file written at build time, served as a same-origin <link>, must be what
 * the runtime hydrates from. Rendering a variant it contains then touches no stylesheet at all.
 */
const staticMedia = { wide: '(min-width: 1px)' }
const staticStyle = { color: 'rgb(5, 5, 5)', variants: { tone: { brand: { color: 'rgb(6, 6, 6)' } } } }

const staticCase = `(cascade) => {
	// Style rules only: hydration re-creates the empty groups getCssText() leaves out, which is scaffolding, not styles.
	const countRules = (rules) => Array.from(rules).reduce((sum, rule) => sum + (rule.cssRules ? countRules(rule.cssRules) : rule.cssText.startsWith('--sxs') ? 0 : 1), 0)
	const before = countRules(document.styleSheets[0].cssRules)

	const { css } = stitches.createStitches({ cascade, media: ${JSON.stringify(staticMedia)} })
	const element = document.createElement('div')
	element.className = css(${JSON.stringify(staticStyle)})({ tone: { '@wide': 'brand' } }).className
	document.body.appendChild(element)

	return JSON.stringify({ sheets: document.styleSheets.length, added: countRules(document.styleSheets[0].cssRules) - before, color: getComputedStyle(element).color })
}`

for (const cascade of ['legacy', 'declared'] as const) {
	const stitches = createStitches({ cascade, media: staticMedia, root: null })
	const extracted = extractCss(stitches, [stitches.css(staticStyle)])

	const page = await browser.newPage()
	const files: Record<string, [string, string]> = {
		'/': ['text/html', '<!doctype html><html><head><link rel="stylesheet" href="/stitches.css"><script src="/stitches.js"></script></head><body></body></html>'],
		'/stitches.css': ['text/css', extracted],
		'/stitches.js': ['text/javascript', readFileSync(globalBuild, 'utf8')],
	}
	await page.route('http://stitches.test/**', (route) => {
		const [contentType, body] = files[new URL(route.request().url()).pathname] ?? ['text/plain', '']
		return route.fulfill({ contentType, body })
	})
	await page.goto('http://stitches.test/')

	const actual = await page.evaluate(`(${staticCase})(${JSON.stringify(cascade)})`)
	const expected = JSON.stringify({ sheets: 1, added: 0, color: 'rgb(6, 6, 6)' })
	await page.close()

	checked++
	if (actual === expected) {
		console.log(`  ok   ${cascade}: a statically extracted file is hydrated, not re-injected`)
	} else {
		failures.push(`${cascade}: a statically extracted file is hydrated, not re-injected\n    expected ${expected}\n    actual   ${JSON.stringify(actual)}`)
		console.log(`  FAIL ${cascade}: a statically extracted file is hydrated, not re-injected`)
	}
}

/**
 * Served from another origin, the same file cannot be hydrated: the browser does not let a script
 * read a cross-origin stylesheet's rules. The runtime must notice, write its own sheet, and still
 * style the element correctly. The static README states this; this is what backs it.
 */
{
	const stitches = createStitches({ cascade: 'declared', media: staticMedia, root: null })
	const extracted = extractCss(stitches, [stitches.css(staticStyle)])

	const page = await browser.newPage()
	await page.route('http://stitches.test/**', (route) =>
		new URL(route.request().url()).pathname === '/stitches.js'
			? route.fulfill({ contentType: 'text/javascript', body: readFileSync(globalBuild, 'utf8') })
			: route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><link rel="stylesheet" href="http://cdn.test/stitches.css"><script src="/stitches.js"></script></head><body></body></html>' }),
	)
	await page.route('http://cdn.test/**', (route) => route.fulfill({ contentType: 'text/css', body: extracted }))
	await page.goto('http://stitches.test/')

	const actual = await page.evaluate(`(() => {
		const { css } = stitches.createStitches({ cascade: 'declared', media: ${JSON.stringify(staticMedia)} })
		const element = document.createElement('div')
		element.className = css(${JSON.stringify(staticStyle)})({ tone: { '@wide': 'brand' } }).className
		document.body.appendChild(element)
		return JSON.stringify({ sheets: document.styleSheets.length, color: getComputedStyle(element).color })
	})()`)
	const expected = JSON.stringify({ sheets: 2, color: 'rgb(6, 6, 6)' })
	await page.close()

	checked++
	if (actual === expected) {
		console.log('  ok   a cross-origin extracted file is not hydrated, and the page still styles correctly')
	} else {
		failures.push(`a cross-origin extracted file\n    expected ${expected}\n    actual   ${JSON.stringify(actual)}`)
		console.log('  FAIL a cross-origin extracted file is not hydrated, and the page still styles correctly')
	}
}

/**
 * The plain bundle on its own: one <style>, no script. Component classes, a variant, a utility
 * overriding a component style, a breakpoint utility and a theme switch must all resolve, since a
 * single exported html page has nothing else to style it.
 */
for (const cascade of ['legacy', 'declared'] as const) {
	const stitches = createStitches({
		cascade,
		root: null,
		media: { tablet: '(min-width: 768px)' },
		theme: { colors: { text: 'rgb(0, 0, 0)', primary: 'rgb(0, 0, 255)' }, space: { 1: '4px', 2: '8px' } },
	})
	const button = stitches.css({ color: '$text', padding: '$1', variants: { tone: { brand: { color: '$primary' } } } })
	const dark = stitches.createTheme('dark', { colors: { primary: 'rgb(255, 0, 0)' } })
	const bundle = bundleCss(stitches, [{ button, dark }])

	const plain = button().className
	const brand = button({ tone: 'brand' }).className

	const page = await browser.newPage({ viewport: { width: 1024, height: 768 } })
	await page.setContent(
		`<!doctype html><html><head><style>${bundle}</style></head><body>` +
			`<b id="plain" class="${plain}"></b><b id="brand" class="${brand}"></b>` +
			`<b id="override" class="${plain} color-primary"></b><b id="responsive" class="${plain} tablet:padding-2"></b>` +
			`<div class="dark"><b id="themed" class="color-primary"></b></div></body></html>`,
	)

	const actual = await page.evaluate(`JSON.stringify({
		plain: getComputedStyle(document.getElementById('plain')).color,
		brand: getComputedStyle(document.getElementById('brand')).color,
		override: getComputedStyle(document.getElementById('override')).color,
		responsive: getComputedStyle(document.getElementById('responsive')).paddingTop,
		themed: getComputedStyle(document.getElementById('themed')).color,
		scripts: document.scripts.length,
	})`)
	const expected = JSON.stringify({ plain: 'rgb(0, 0, 0)', brand: 'rgb(0, 0, 255)', override: 'rgb(0, 0, 255)', responsive: '8px', themed: 'rgb(255, 0, 0)', scripts: 0 })
	await page.close()

	checked++
	if (actual === expected) {
		console.log(`  ok   ${cascade}: the plain bundle styles a page with no runtime`)
	} else {
		failures.push(`${cascade}: the plain bundle styles a page with no runtime\n    expected ${expected}\n    actual   ${JSON.stringify(actual)}`)
		console.log(`  FAIL ${cascade}: the plain bundle styles a page with no runtime`)
	}
}

/**
 * Atomic output resolves per element at render time; the browser must agree with what the merge
 * decided, with every rule written in the order that would mislead a naive sheet.
 */
const atomicCase = `() => {
	const { css } = stitches.createStitches({ atomic: true, media: { wide: '(min-width: 1px)' } })
	const resolve = (className, property) => {
		const element = document.createElement('div')
		element.className = className
		document.body.appendChild(element)
		return getComputedStyle(element)[property]
	}

	// the parent renders first, so its variant's rule is written before the extension's
	const parent = css({ color: 'rgb(0, 0, 0)', variants: { tone: { muted: { color: 'rgb(1, 1, 1)' } } }, defaultVariants: { tone: 'muted' } })
	parent()
	const child = css(parent, { color: 'rgb(2, 2, 2)' })

	// the longhand is written before the shorthand
	css({ paddingTop: 12 })()
	const refined = css({ padding: 4, variants: { tall: { true: { paddingTop: 12 } } } })

	const reset = css({ paddingTop: 8, variants: { flat: { true: { padding: 0 } } } })

	// a breakpoint value in the base, then an unconditional variant declared later: the variant wins, as in 'declared'
	const responsive = css({ '@wide': { color: 'rgb(3, 3, 3)' }, variants: { plain: { true: { color: 'rgb(4, 4, 4)' } } } })

	return JSON.stringify({
		extension: resolve(child().className, 'color'),
		refinedTop: resolve(refined({ tall: true }).className, 'paddingTop'),
		refinedLeft: resolve(refined({ tall: true }).className, 'paddingLeft'),
		reset: resolve(reset({ flat: true }).className, 'paddingTop'),
		breakpoint: resolve(responsive({ plain: true }).className, 'color'),
	})
}`

{
	const page = await browser.newPage()
	await page.setContent('<!doctype html><html><body></body></html>')
	await page.addScriptTag({ path: globalBuild })
	const actual = await page.evaluate(`(${atomicCase})()`)
	const expected = JSON.stringify({ extension: 'rgb(2, 2, 2)', refinedTop: '12px', refinedLeft: '4px', reset: '0px', breakpoint: 'rgb(4, 4, 4)' })
	await page.close()

	checked++
	console.log('atomic output')
	if (actual === expected) {
		console.log('  ok   each element resolves to what the render-time merge decided')
	} else {
		failures.push(`atomic: each element resolves to what the render-time merge decided\n    expected ${expected}\n    actual   ${JSON.stringify(actual)}`)
		console.log('  FAIL atomic: each element resolves to what the render-time merge decided')
	}
}

/**
 * Atomic output against the declared cascade, element by element, in a real browser: every variant
 * combination of a three-level composition, rendered forwards in one page with `cascade: 'declared'`
 * and backwards in another with `atomic: true`, must resolve to the same computed styles. The fixture
 * mixes shorthands and longhands in both orders, compound variants, the `css` prop, and responsive
 * props whose breakpoint values compete with later unconditional variants. It leaves out the one
 * documented difference (two different breakpoints, declared against `config.media` order), so any
 * difference here is a bug.
 */
const differentialCase = `(mode) => {
	const { css } = stitches.createStitches(mode === 'atomic' ? { atomic: true, media: { md: '(min-width: 1px)' } } : { cascade: 'declared', media: { md: '(min-width: 1px)' } })

	const base = css({
		color: 'rgb(1, 1, 1)', padding: 4, borderTop: '1px solid',
		variants: {
			tone: { a: { color: 'rgb(2, 2, 2)' }, b: { color: 'rgb(3, 3, 3)', paddingTop: 10 } },
			flat: { true: { padding: 0 } },
			size: { s: { fontWeight: 300 }, l: { fontWeight: 700, borderTopWidth: 3 } },
		},
		compoundVariants: [{ tone: 'b', size: 'l', css: { opacity: 0.5, paddingLeft: 7 } }],
		defaultVariants: { tone: 'a' },
	})
	const extended = css(base, { color: 'rgb(4, 4, 4)', variants: { tone: { c: { color: 'rgb(5, 5, 5)', margin: 2 } }, quiet: { true: { opacity: 0.8, borderTopStyle: 'dashed' } } } })
	const deepest = css(extended, { paddingTop: 1, variants: { size: { l: { padding: 3 } } } })

	const cases = []
	for (const [name, component] of [['base', base], ['extended', extended], ['deepest', deepest]]) {
		for (const tone of [undefined, 'a', 'b', 'c', { '@initial': 'a', '@md': 'b' }]) for (const flat of [undefined, true]) for (const size of [undefined, 's', 'l', { '@initial': 's', '@md': 'l' }]) for (const quiet of [undefined, true]) for (const override of [undefined, { color: 'rgb(9, 9, 9)', paddingLeft: 5 }]) {
			cases.push([JSON.stringify({ name, tone, flat, size, quiet, override }), component, { tone, flat, size, quiet, css: override }])
		}
	}
	if (mode === 'atomic') cases.reverse()

	const properties = ['color', 'padding-top', 'padding-left', 'margin-top', 'border-top-width', 'border-top-style', 'font-weight', 'opacity']
	const resolved = {}
	for (const [key, component, props] of cases) {
		const element = document.createElement('div')
		element.className = component(props).className
		document.body.appendChild(element)
		const computed = getComputedStyle(element)
		resolved[key] = properties.map((property) => computed.getPropertyValue(property)).join('|')
	}
	return JSON.stringify(resolved)
}`

{
	const resolveIn = async (mode: 'declared' | 'atomic'): Promise<Record<string, string>> => {
		const page = await browser.newPage()
		await page.setContent('<!doctype html><html><body></body></html>')
		await page.addScriptTag({ path: globalBuild })
		const result = await page.evaluate(`(${differentialCase})(${JSON.stringify(mode)})`)
		await page.close()
		return typeof result === 'string' ? JSON.parse(result) : {}
	}

	const declared = await resolveIn('declared')
	const atomic = await resolveIn('atomic')
	const keys = Object.keys(declared)
	const differing = keys.filter((key) => declared[key] !== atomic[key])

	checked++
	if (keys.length > 0 && keys.length === Object.keys(atomic).length && differing.length === 0) {
		console.log(`  ok   atomic output resolves like the declared cascade, ${keys.length} elements`)
	} else {
		failures.push(
			`atomic vs declared: ${differing.length} of ${keys.length} elements differ\n` +
				differing
					.slice(0, 5)
					.map((key) => `    ${key}\n      declared ${declared[key]}\n      atomic   ${atomic[key]}`)
					.join('\n'),
		)
		console.log(`  FAIL atomic output resolves like the declared cascade (${differing.length} of ${keys.length} differ)`)
	}
}

await browser.close()

if (failures.length) {
	console.log(`\n${failures.length} of ${checked} checks failed:\n`)
	for (const failure of failures) console.log(failure)
	process.exit(1)
}

console.log(`\nall ${checked} checks passed`)
