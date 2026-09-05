const modPath = process.argv[2]
const label = process.argv[3]
const mod = await import(modPath)
const { createStitches } = mod

const mk = () =>
	createStitches({
		media: { bp1: '(min-width: 640px)', bp2: '(min-width: 1024px)' },
		theme: {
			colors: { red: 'tomato', blue: 'dodgerblue', gray: '#888' },
			space: { 1: '4px', 2: '8px', 3: '16px' },
			fontSizes: { 1: '12px', 2: '14px', 3: '16px' },
		},
		utils: { px: (v: any) => ({ paddingLeft: v, paddingRight: v }) },
	})

const buttonStyle = {
	padding: '$2',
	px: '$3',
	color: '$red',
	borderRadius: 4,
	'&:hover': { color: '$blue' },
	'@bp1': { padding: '$3' },
	variants: {
		size: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		variant: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' } },
		rounded: { true: { borderRadius: 999 } },
	},
	compoundVariants: [{ size: 'lg', variant: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size: 'md', variant: 'primary' },
}

const time = (name: string, iters: number, fn: (i: number) => void, runs = 7) => {
	const samples: number[] = []
	for (let r = 0; r < runs; r++) {
		const t0 = performance.now()
		for (let i = 0; i < iters; i++) fn(i)
		samples.push(performance.now() - t0)
	}
	samples.sort((a, b) => a - b)
	const med = samples[Math.floor(runs / 2)]
	const perOp = (med / iters) * 1e6
	console.log(`${label.padEnd(10)} ${name.padEnd(42)} ${med.toFixed(1).padStart(8)} ms  ${perOp.toFixed(0).padStart(7)} ns/op`)
}

// warmup / setup
{
	const s = mk()
	const B = s.css(buttonStyle)
	for (let i = 0; i < 20000; i++) B({ size: 'lg' })
}

// 1. component creation (unique styles)
{
	const s = mk()
	time('css() create, unique style', 20000, (i) => {
		s.css({ ...buttonStyle, marginTop: i })
	}, 3)
}

// 2. warm render, static variants
{
	const s = mk()
	const B = s.css(buttonStyle)
	B({ size: 'lg', variant: 'primary', rounded: true })
	time('render warm, 3 variants + compound', 200000, () => {
		B({ size: 'lg', variant: 'primary', rounded: true })
	})
}

// 3. warm render, defaults only
{
	const s = mk()
	const B = s.css(buttonStyle)
	B()
	time('render warm, defaults only', 200000, () => {
		B({})
	})
}

// 4. warm render, responsive variant
{
	const s = mk()
	const B = s.css(buttonStyle)
	const resp = { '@initial': 'sm', '@bp1': 'md', '@bp2': 'lg' }
	B({ size: resp })
	time('render warm, responsive variant', 100000, () => {
		B({ size: resp })
	})
}

// 5. warm render, css prop same identity
{
	const s = mk()
	const B = s.css(buttonStyle)
	const cssObj = { marginTop: '$2', '&:focus': { outline: '2px solid $blue' } }
	B({ css: cssObj })
	time('render warm, css prop (same object)', 100000, () => {
		B({ css: cssObj })
	})
}

// 6. warm render, css prop fresh object each render (typical inline literal)
{
	const s = mk()
	const B = s.css(buttonStyle)
	time('render warm, css prop (fresh literal)', 100000, () => {
		B({ css: { marginTop: '$2', '&:focus': { outline: '2px solid $blue' } } })
	})
}

// 7. composed component: 3 levels deep
{
	const s = mk()
	const A = s.css(buttonStyle)
	const Bc = s.css(A, { color: '$gray', variants: { tone: { a: { opacity: 0.5 }, b: { opacity: 1 } } } })
	const C = s.css(Bc, { margin: '$1' })
	C({ size: 'sm', tone: 'a' })
	time('render warm, 3-level composition', 100000, () => {
		C({ size: 'sm', tone: 'a' })
	})
}

// 8. cold injection throughput: unique components, first render each
{
	const s = mk()
	const comps: any[] = []
	for (let i = 0; i < 5000; i++) comps.push(s.css({ ...buttonStyle, marginTop: i }))
	time('cold first-render + inject, 5000 comps', 5000, (i) => {
		comps[i]({ size: 'lg', rounded: true })
	}, 1)
	const t0 = performance.now()
	const text = s.getCssText()
	console.log(`${label.padEnd(10)} ${'getCssText (5000 comps)'.padEnd(42)} ${(performance.now() - t0).toFixed(1).padStart(8)} ms  ${(text.length / 1024).toFixed(0)} KB`)
}
