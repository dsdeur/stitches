const paths = { canary: process.argv[2], ts: process.argv[3] }
const mods: Record<string, any> = {}
for (const k in paths) mods[k] = await import(paths[k as keyof typeof paths])
const style = {
	padding: '$2', color: '$red', borderRadius: 4, '&:hover': { color: '$blue' },
	variants: { size: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } }, variant: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' } }, rounded: { true: { borderRadius: 999 } } },
	compoundVariants: [{ size: 'lg', variant: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size: 'md', variant: 'primary' },
}
const comps: Record<string, any> = {}
for (const k in mods) {
	const { css } = mods[k].createStitches({ media: { bp1: '(min-width: 640px)' }, theme: { colors: { red: 'tomato', blue: 'dodgerblue' }, space: { 2: '8px' }, fontSizes: { 1: '12px', 2: '14px', 3: '16px' } } })
	comps[k] = css(style)
	comps[k]({ size: 'lg', variant: 'primary', rounded: true })
}
const N = 300000
const res: Record<string, number[]> = { canary: [], ts: [] }
// interleave to cancel thermal / GC drift
for (let round = 0; round < 12; round++) {
	for (const k of round % 2 ? ['ts', 'canary'] : ['canary', 'ts']) {
		const B = comps[k]
		const t0 = performance.now()
		for (let i = 0; i < N; i++) B({ size: 'lg', variant: 'primary', rounded: true })
		res[k].push((performance.now() - t0) / N * 1e6)
	}
}
for (const k in res) {
	const s = res[k].sort((a, b) => a - b)
	console.log(k.padEnd(8), 'min', s[0].toFixed(0), 'median', s[6].toFixed(0), 'max', s[11].toFixed(0), 'ns/op')
}
