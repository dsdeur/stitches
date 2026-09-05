import { createStitches } from '../../packages/core/src/index.ts'
const { css, getCssText, reset } = createStitches()

console.log('--- Case 1: extension base style vs parent default variant ---')
const A = css({ color: 'black', variants: { tone: { muted: { color: 'gray' } } }, defaultVariants: { tone: 'muted' } })
const B = css(A, { color: 'red' })
console.log('className:', B().className)
console.log(getCssText().replace(/--sxs\{--sxs:[^}]*\}/g, '').replace(/@media\{\}/g, ''))
console.log('=> B says color:red, but A\'s default variant color:gray is in the later "onevar" group and wins.\n')

reset()
console.log('--- Case 2: variant of extension vs base of extension (fine) ---')
const C = css({ color: 'black' })
const D = css(C, { color: 'red', variants: { x: { on: { color: 'blue' } } } })
console.log('className:', D({ x: 'on' }).className)
console.log(getCssText().replace(/--sxs\{--sxs:[^}]*\}/g, '').replace(/@media\{\}/g, ''))
console.log('=> variant wins over base as intended.\n')

reset()
console.log('--- Case 3: two independent components combined via className, order = first-render order ---')
const E = css({ padding: '4px' })
const F = css({ padding: '8px' })
// render F first so its rule is injected first
F()
console.log('className:', E({ className: F.className }).className)
console.log(getCssText().replace(/--sxs\{--sxs:[^}]*\}/g, '').replace(/@media\{\}/g, ''))
console.log('=> E rendered "with F applied on top", but F was injected first so E wins. Order depends on render history, not on intent.\n')

reset()
console.log('--- Case 4: extension of extension, base rule dedupe by hash ---')
const G = css({ margin: '1px' })
const H = css(G, { margin: '2px' })
const I = css(H, { margin: '3px' })
// render I first, then H standalone
console.log('I:', I().className)
console.log('H:', H().className)
console.log(getCssText().replace(/--sxs\{--sxs:[^}]*\}/g, '').replace(/@media\{\}/g, ''))
console.log('=> chain order preserved because composers are visited base-first; this case is fine.')
