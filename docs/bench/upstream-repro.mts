import { createStitches } from '../../packages/core/src/index.ts'
const strip = (s: string) => s.replace(/--sxs\{--sxs:[^}]*\}/g, '').replace(/@media\{\}/g, '')

console.log('=== #1146 / #896: responsive value equal to @initial value ===')
{
	const { css, getCssText } = createStitches({ media: { small: '(min-width: 100px)', medium: '(min-width: 200px)' } })
	const C = css({ variants: { color: { red: { color: 'red' }, blue: { color: 'blue' } } } })
	console.log(C({ color: { '@initial': 'red', '@small': 'blue', '@medium': 'red' } }).className)
	console.log(strip(getCssText()))
	console.log('-> expected an unwrapped `color:red` rule for @initial; got only media-wrapped red\n')
}

console.log('=== #1069: time-valued properties get px ===')
{
	const { css, getCssText } = createStitches()
	css({ animationDelay: 200, transitionDuration: 300, animationDuration: 1 })()
	console.log(strip(getCssText()), '\n')
}

console.log('=== #923: dot in variant name ===')
{
	const { css, getCssText } = createStitches()
	const C = css({ variants: { size: { '1.5': { padding: 6 } } } })
	console.log(C({ size: '1.5' }).className)
	console.log(strip(getCssText()), '\n')
}

console.log('=== #986: token replacement inside url() ===')
{
	const { css, getCssText } = createStitches()
	css({ backgroundImage: 'url(/img/logo$dark.png)', content: '"price: $5"', fontFamily: 'a--b' })()
	console.log(strip(getCssText()), '\n')
}

console.log('=== #976 / #1039: shared style hash across components, first render decides order ===')
{
	const { css, getCssText } = createStitches()
	const base = { color: 'black' }
	const over = { color: 'red' }
	const A = css(base)
	const B = css(A, over)
	const C = css(over)
	C() // C rendered first
	console.log('B:', B().className)
	console.log(strip(getCssText()))
	console.log('-> B should be red; over-rule was injected before base because C rendered first\n')
}

console.log('=== #1085: util and variant share a name ===')
{
	const { css, getCssText } = createStitches({ utils: { size: (v: any) => ({ width: v, height: v }) } })
	const C = css({ variants: { size: { small: { height: '42px' }, large: { height: '56px' } } }, defaultVariants: { size: 'small' } })
	console.log(C().className)
	console.log(strip(getCssText()), '\n')
}

console.log('=== #1094 (server side path): shorthand + token followed by longhand override ===')
{
	const { css, getCssText } = createStitches({ theme: { space: { 1: '12px' } } })
	css({ padding: '$1', paddingBottom: 0 })()
	console.log(strip(getCssText()))
	console.log('-> server mock is fine; the reported garbage comes from browser CSSOM cssText serialization of shorthands\n')
}

console.log('=== #570: what css() returns ===')
{
	const { css } = createStitches()
	const C = css({ color: 'red' })
	console.log(typeof C, typeof C(), String(C()), C.className)
}
