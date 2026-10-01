/**
 * Seeded random component definitions and props, for differential tests: the same input run two
 * ways (atomic and declared, web and native, extracted and runtime) must agree. Every value is one
 * a browser and React Native both accept and both report back the same way, so a difference is a
 * difference in resolution, never in formatting.
 *
 * A run is reproducible from its seed: tests print the seed on failure, and `SEED=<n>` reruns it.
 */

/** mulberry32: small, fast, and good enough to spread test cases. */
export const createRandom = (seed: number) => {
	let state = seed >>> 0

	const next = (): number => {
		state = (state + 0x6d2b79f5) >>> 0
		let t = state
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}

	const integer = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1))
	const pick = <Value>(values: readonly Value[]): Value => values[integer(0, values.length - 1)]
	const chance = (probability: number): boolean => next() < probability

	return { next, integer, pick, chance }
}

export type Random = ReturnType<typeof createRandom>

/** Breakpoints: `md` always matches, `lg` never does, so both branches of every responsive value run. */
export const media = { md: '(min-width: 1px)', lg: '(min-width: 100000px)' } as const

export interface Style {
	[property: string]: string | number | Style
}

export type Variants = { [name: string]: { [value: string]: Style } }

/** The values that must all match, plus the style they add under `css`. */
export type CompoundVariant = { [name: string]: string | Style } & { css: Style }

export interface Definition {
	[property: string]: string | number | Style | Variants | CompoundVariant[] | undefined
	variants?: Variants
	compoundVariants?: CompoundVariant[]
	defaultVariants?: { [name: string]: string }
}

export type VariantProp = string | { readonly [breakpoint: string]: string }

export type Props = { [name: string]: VariantProp | Style | undefined }

/**
 * Properties that mean the same thing on the web and in React Native, including shorthand and
 * longhand pairs, since their order is where resolution goes wrong.
 */
const properties: readonly { readonly name: string; readonly value: (random: Random) => string | number }[] = [
	{ name: 'color', value: (random) => `rgb(${random.integer(1, 250)}, 0, 0)` },
	{ name: 'backgroundColor', value: (random) => `rgb(0, ${random.integer(1, 250)}, 0)` },
	{ name: 'opacity', value: (random) => random.integer(1, 9) / 10 },
	{ name: 'fontWeight', value: (random) => random.integer(1, 9) * 100 },
	{ name: 'padding', value: (random) => random.integer(0, 20) },
	{ name: 'paddingTop', value: (random) => random.integer(0, 20) },
	{ name: 'paddingLeft', value: (random) => random.integer(0, 20) },
	{ name: 'margin', value: (random) => random.integer(0, 20) },
	{ name: 'marginTop', value: (random) => random.integer(0, 20) },
	{ name: 'borderRadius', value: (random) => random.integer(0, 20) },
	{ name: 'borderTopLeftRadius', value: (random) => random.integer(0, 20) },
]

/**
 * Every generated style object carries a unique `--u` custom property. Class names are hashes of
 * style content, so two random components that happen to share `{ marginTop: 12 }` at different
 * depths would share a class, and in the declared cascade the deeper copy wins wherever that class
 * is applied (a documented property of 'declared', roadmap 11.2). These tests are about how styles
 * resolve, so they keep that coincidence out; nothing compares `--u`.
 */
let unique = 0

const style = (random: Random): Style => {
	const result: Style = { '--u': ++unique }

	for (let count = random.integer(1, 4); count > 0; count--) {
		const property = random.pick(properties)
		result[property.name] = property.value(random)
	}

	return result
}

/** A style, sometimes with a block under a breakpoint. */
const styleWithBreakpoint = (random: Random): Style => {
	const result = style(random)

	if (random.chance(0.25)) result[`@${random.pick(['md', 'lg'])}`] = style(random)

	return result
}

export interface GeneratedComponent {
	/** Base first: each definition extends the ones before it. */
	readonly chain: readonly Definition[]
	/** Every variant name in the chain with its values, for generating props. */
	readonly variants: { readonly [name: string]: readonly string[] }
}

/** A composition one to three levels deep, each level with its own base style and variants. */
export const generateComponent = (random: Random): GeneratedComponent => {
	const chain: Definition[] = []
	const variants: { [name: string]: string[] } = {}

	for (let level = random.integer(1, 3); level > 0; level--) {
		const definition: Definition = { ...styleWithBreakpoint(random) }
		const levelVariants: Variants = {}

		for (let count = random.integer(0, 3); count > 0; count--) {
			// reuse a name from a shallower level sometimes: an extension adding values to a variant
			const name = Object.keys(variants).length && random.chance(0.3) ? random.pick(Object.keys(variants)) : `v${random.integer(0, 99)}`
			const values: { [value: string]: Style } = {}

			for (let valueCount = random.integer(1, 3); valueCount > 0; valueCount--) {
				const value = random.chance(0.2) ? 'true' : random.pick(['a', 'b', 'c'])
				values[value] = styleWithBreakpoint(random)
				variants[name] = [...new Set([...(variants[name] ?? []), value])]
			}

			levelVariants[name] = values
		}

		if (Object.keys(levelVariants).length) definition.variants = levelVariants

		const names = Object.keys(variants)

		if (names.length >= 2 && random.chance(0.5)) {
			const first = random.pick(names)
			const second = random.pick(names.filter((name) => name !== first))
			definition.compoundVariants = [{ [first]: random.pick(variants[first]), [second]: random.pick(variants[second]), css: style(random) }]
		}

		if (names.length && random.chance(0.4)) {
			const name = random.pick(names)
			definition.defaultVariants = { [name]: random.pick(variants[name]) }
		}

		chain.push(definition)
	}

	return { chain, variants }
}

export interface PropsOptions {
	/** Allow per-breakpoint values. */
	readonly responsive?: boolean
	/** Allow a `css` prop. */
	readonly css?: boolean
	/**
	 * Keep every per-breakpoint value of one render at a single breakpoint: the combinations static
	 * extraction writes ahead of time.
	 */
	readonly singleBreakpoint?: boolean
}

/** Random props for a generated component: plain values, per-breakpoint values, a `css` override. */
export const generateProps = (random: Random, { variants }: GeneratedComponent, { responsive = true, css = true, singleBreakpoint = false }: PropsOptions = {}): Props => {
	const props: Props = {}
	const breakpoint = random.pick(['@md', '@lg'])

	for (const [name, values] of Object.entries(variants)) {
		if (random.chance(0.35)) continue

		if (responsive && random.chance(0.3)) {
			const value: { [breakpoint: string]: string } = {}
			if (random.chance(0.5)) value['@initial'] = random.pick(values)
			value[singleBreakpoint ? breakpoint : random.pick(['@md', '@lg'])] = random.pick(values)
			props[name] = value
		} else props[name] = random.pick(values)
	}

	if (css && random.chance(0.25)) props.css = style(random)

	return props
}
