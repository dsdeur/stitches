// Renders a fixture with every variant kind against a given core entry and prints class names + CSS.
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

const { createStitches } = await import(pathToFileURL(resolve(process.argv[2])).href)
const s = createStitches({
	media: { bp1: '(min-width: 640px)', bp2: '(min-width: 1024px)' },
	theme: { colors: { red: 'tomato', blue: 'dodgerblue' }, space: { 1: '4px', 2: '8px' } },
	utils: { px: (v: any) => ({ paddingLeft: v, paddingRight: v }) },
})
const A = s.css({
	padding: '$2', px: '$1', color: '$red', '&:hover': { color: '$blue' },
	variants: {
		size: { sm: { fontSize: 12 }, md: { fontSize: 14 }, lg: { fontSize: 16 } },
		tone: { a: { opacity: 0.5 }, b: { opacity: 1 }, true: { outline: '1px solid' } },
	},
	compoundVariants: [{ size: 'lg', tone: 'a', css: { fontWeight: 700 } }, { size: 'sm', tone: true, css: { margin: 0 } }],
	defaultVariants: { size: 'md' },
})
const Bc = s.css(A, { color: '$blue', variants: { x: { on: { display: 'flex' }, off: { display: 'none' } } } })
const out: string[] = []
out.push(A({ size: 'lg', tone: 'a' }).className)
out.push(A({ size: 'sm', tone: true }).className)
out.push(A({ size: { '@initial': 'sm', '@bp1': 'md', '@bp2': 'lg' }, tone: 'b' }).className)
out.push(A({ size: { '@bp2': 'lg' }, tone: { '@initial': 'a', '@bp1': 'b' } }).className)
out.push(A({ size: { '@initial': 'lg', '@bp1': 'lg' }, tone: 'a' }).className) // compound under responsive
out.push(Bc({ size: 'lg', x: 'on', tone: 'a' }).className)
out.push(Bc({ x: { '@initial': 'off', '@bp1': 'on' } }).className)
// same responsive props again to exercise the cache path
out.push(A({ size: { '@initial': 'sm', '@bp1': 'md', '@bp2': 'lg' }, tone: 'b' }).className)
out.push(A({ css: { marginTop: '$1' } }).className)
console.log(out.join('\n'))
console.log(s.getCssText())
