import { createStitches, defaultThemeMap } from '../../packages/core/src/index.ts'
const strip = (s: string) => s.replace(/--sxs\{--sxs:[^}]*\}/g, '').replace(/@media\{\}/g, '')

console.log('=== #1004 / #832: cyclic `root` object passed to createStitches (createMemo JSON.stringify) ===')
{
	const fakeRoot: any = { styleSheets: [] }
	fakeRoot.self = fakeRoot // document-like objects are cyclic
	try { createStitches({ root: fakeRoot }); console.log('ok, no throw') } catch (e: any) { console.log('THROWS:', e.message.slice(0, 80)) }
	console.log()
}

console.log('=== #1135: vendor-prefixed camelCase property ===')
{
	const { css, getCssText } = createStitches()
	css({ WebkitBackgroundClip: 'text', MozAppearance: 'none', msOverflowStyle: 'none' })()
	console.log(strip(getCssText()), '\n')
}

console.log('=== #1009 (P1): variant priority follows first-render order, not declaration order ===')
{
	const { css, getCssText } = createStitches()
	const Btn = css({ variants: { variant: { primary: { color: 'blue' } }, isDisabled: { true: { color: 'gray' } } } })
	Btn({ isDisabled: true })            // first render injects isDisabled rule first
	Btn({ variant: 'primary', isDisabled: true })
	console.log(strip(getCssText()))
	console.log('-> isDisabled declared later but injected first; primary (blue) wins in cascade\n')
}

console.log('=== #885: responsive variant classes ordered by first render, not by breakpoint order ===')
{
	const { css, getCssText } = createStitches({ media: { md: '(min-width: 768px)', lg: '(min-width: 1024px)' } })
	const Stack = css({ variants: { gap: { 8: { gap: 8 }, 10: { gap: 10 }, 20: { gap: 20 } } } })
	Stack({ gap: { '@initial': 8, '@lg': 20 } })             // parent renders first: injects @lg 20
	Stack({ gap: { '@initial': 8, '@md': 10, '@lg': 20 } })  // child: @md 10 injected AFTER @lg 20
	console.log(strip(getCssText()))
	console.log('-> at >=1024px both @md and @lg match; @md rule is later in the sheet so gap:10 wins instead of 20\n')
}

console.log('=== #1165: @import placement in globalCss ===')
{
	const { globalCss, getCssText, css } = createStitches({ theme: { colors: { a: 'red' } } })
	css({ color: 'red' })()
	globalCss({ '@import': 'url(a.css)', body: { margin: 0 } })()
	console.log(getCssText().slice(0, 160), '...\n')
}

console.log('=== PR #1110 / #1154 / #1159: themeMap coverage ===')
console.log('accentColor in defaultThemeMap:', 'accentColor' in defaultThemeMap, '| borderInlineColor:', 'borderInlineColor' in defaultThemeMap, '| borderBlockColor:', 'borderBlockColor' in defaultThemeMap)
