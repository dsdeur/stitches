/**
 * Captures the two inputs `cascade-audit.mts` compares, from a running app.
 *
 *   tsx docs/bench/cascade-capture.mts <label> <outDir> <baseUrl> [route ...]
 *
 * Writes `<outDir>/<label>.css` (the stitches sheet as the browser holds it) and
 * `<outDir>/<label>.html` (the markup of every route visited). Run it once per mode —
 * flip the app's `cascade` between runs — then feed both sheets and either html file to
 * `cascade-audit.mts`.
 *
 * Routes are visited with history.pushState plus a popstate event, which every client-side
 * router listens to, so the app never reloads and the sheet keeps accumulating. This
 * matters: a full navigation throws the sheet away, so capturing after each `page.goto`
 * leaves only the last route's rules in the file and the audit then compares almost
 * nothing. Accumulating in one page load is also the realistic case, because it is what
 * makes legacy order depend on the order the user happened to visit things in.
 *
 * Pass routes as arguments (path segments, no leading slash; "" for the root). An app that
 * routes some other way needs its own driver; the sheet-reading part below is the reusable
 * bit.
 */
import { writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const [label, outDir, baseUrl, ...routes] = process.argv.slice(2)

if (!label || !outDir || !baseUrl) {
	console.error('usage: tsx docs/bench/cascade-capture.mts <label> <outDir> <baseUrl> [route ...]')
	process.exit(2)
}

/** Serializes every stitches sheet, keeping the group wrappers the audit parses. */
const readSheet = (): string => {
	let out = ''
	for (const sheet of Array.from(document.styleSheets)) {
		let rules: CSSRuleList
		try {
			rules = sheet.cssRules
		} catch {
			// A cross-origin sheet cannot be read and is never ours.
			continue
		}
		const text = Array.from(rules, (rule) => rule.cssText).join('')
		if (text.includes('--sxs')) out += text
	}
	return out
}

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

const errors: string[] = []
page.on('pageerror', (error) => errors.push(String(error)))

await page.goto(baseUrl, { waitUntil: 'networkidle' })

let html = `\n<!-- ${baseUrl}/ -->\n` + (await page.content())

for (const route of routes) {
	await page.evaluate((path) => {
		window.history.pushState(null, '', path ? `/${path}` : '/')
		window.dispatchEvent(new PopStateEvent('popstate'))
	}, route)
	await page.waitForTimeout(120)
	html += `\n<!-- /${route} -->\n` + (await page.content())
}

const css = await page.evaluate(readSheet)
await browser.close()

if (errors.length) console.error(`[${label}] page errors:\n  ${errors.join('\n  ')}`)

writeFileSync(`${outDir}/${label}.css`, css)
writeFileSync(`${outDir}/${label}.html`, html)

const selectors = new Set(css.match(/\.c-[\w-]+/g) ?? [])
console.log(`${label}: ${selectors.size} class rules, ${css.length} bytes of css, ${html.length} bytes of html`)

// A capture with far fewer rules than the app has classes usually means the sheet was read
// after a reload, or that routes never rendered.
if (!selectors.size) {
	console.error(`${label}: no stitches rules found. Is the app rendering, and is it this page's stitches?`)
	process.exit(1)
}
