import { toMediaTest, type Viewport } from './media.ts'

/**
 * Which breakpoints hold right now, and in what order they apply. A key is written the way the web
 * writes it: `@initial`, `@bp1` for a name from `config.media`, or `@media (…)` for a raw query.
 */
export interface MediaContext {
	readonly matches: (key: string) => boolean
	/** `@initial` first, then `config.media` order, then raw queries. */
	readonly order: (key: string) => number
	/** One character per `config.media` entry, so style objects can be cached per breakpoint. */
	readonly signature: string
}

export interface MediaConfig {
	readonly [name: string]: string
}

export type MediaTests = ReadonlyMap<string, { readonly index: number; readonly test: (viewport: Viewport) => boolean }>

export const toMediaTests = (media: MediaConfig = {}): MediaTests => new Map(Object.entries(media).map(([name, query], index) => [`@${name}`, { index, test: toMediaTest(query) }]))

const rawQueries = new Map<string, (viewport: Viewport) => boolean>()

/** Raw queries are parsed once, however many components write them. */
const toRawTest = (key: string): ((viewport: Viewport) => boolean) => {
	const known = rawQueries.get(key)

	if (known) return known

	const test = toMediaTest(key)

	rawQueries.set(key, test)

	return test
}

/**
 * Without a viewport only `@initial` holds, which is what the web does before a stylesheet knows
 * the window: the unconditional rules apply and nothing else.
 */
export const toMediaContext = (tests: MediaTests, viewport: Viewport | undefined): MediaContext => {
	const matched = new Map<string, boolean>()

	for (const [key, { test }] of tests) matched.set(key, viewport !== undefined && test(viewport))

	return {
		matches: (key) => {
			if (key === '@initial') return true

			const known = matched.get(key)

			if (known !== undefined) return known

			return viewport !== undefined && key.startsWith('@media') && toRawTest(key)(viewport)
		},
		order: (key) => (key === '@initial' ? -1 : (tests.get(key)?.index ?? tests.size)),
		signature: Array.from(matched.values(), (value) => (value ? '1' : '0')).join(''),
	}
}
