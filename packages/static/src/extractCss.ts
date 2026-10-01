import type { Composable, ComposerTuple, StitchesInstance } from '../../core/src/types.ts'
import { internal } from '../../core/src/utility/internal.ts'

export interface ExtractOptions {
	/**
	 * Also render every variant value, and every compound variant, at each breakpoint in
	 * `config.media`, so `size={{ '@bp2': 'large' }}` finds its rule in the file. For a compound
	 * variant, every mix of its conditions at one breakpoint and the rest plain. On by default.
	 * A value placed at two breakpoints at once, or a compound whose conditions hold at different
	 * breakpoints, is its own class and is still injected at runtime.
	 */
	readonly responsive?: boolean
}

/** Walks at most this deep into plain objects and arrays, which covers `export const Card = { Root, Title }`. */
const maxWalkDepth = 4

const isComposable = (value: object): value is Composable => {
	if (!(internal in value)) return false

	const internals: unknown = value[internal]

	return typeof internals === 'object' && internals !== null && 'composers' in internals && internals.composers instanceof Set
}

/**
 * `createTheme()` returns the theme's scales plus an own `className` getter and `selector`; reading
 * either writes the theme to the sheet. Only that shape counts, so an arbitrary object with a
 * `selector` string is walked, not rendered.
 */
const isTheme = (value: object): boolean => typeof Object.getOwnPropertyDescriptor(value, 'className')?.get === 'function' && typeof Object.getOwnPropertyDescriptor(value, 'selector')?.value === 'string'

/**
 * What `globalCss()` and `keyframes()` return is a function that is its own `toString`: turning it
 * into a string writes it to the sheet. Components also carry a `toString`, but a different one,
 * and are recognised before this check.
 */
const isSelfRendering = (value: object): boolean => typeof value === 'function' && Object.getOwnPropertyDescriptor(value, 'toString')?.value === value

/** Module namespaces have a null prototype; object literals have Object's. Anything else is left alone. */
const isWalkable = (value: object): boolean => {
	if (Array.isArray(value)) return true

	const prototype = Object.getPrototypeOf(value)

	return prototype === null || prototype === Object.prototype
}

/** Every prop combination worth rendering for one component, deduplicated by their JSON form. */
const toPropSets = (composers: Iterable<ComposerTuple>, mediaNames: readonly string[], responsive: boolean): Record<string, unknown>[] => {
	const propSets = new Map<string, Record<string, unknown>>()
	const add = (props: Record<string, unknown>): void => {
		propSets.set(JSON.stringify(props), props)
	}

	// base styles and default variants
	add({})

	for (const [, , singularVariants, compoundVariants] of composers) {
		for (const [match] of singularVariants) {
			for (const [name, value] of Object.entries(match)) {
				add({ [name]: value })

				if (responsive) for (const media of mediaNames) add({ [name]: { [`@${media}`]: value } })
			}
		}

		for (const [match] of compoundVariants) {
			add({ ...match })

			if (!responsive) continue

			// Each non-empty subset of the conditions at one breakpoint, the rest plain: `size="lg"` with
			// `outline={{ '@bp2': true }}` is its own class, as is both at `@bp2`. Compound variants name
			// few conditions, so this stays a handful of renders per breakpoint.
			const conditions = Object.entries(match)

			for (const media of mediaNames) {
				for (let subset = 1; subset < 1 << conditions.length; subset++) {
					add(Object.fromEntries(conditions.map(([name, value], index) => [name, subset & (1 << index) ? { [`@${media}`]: value } : value])))
				}
			}
		}
	}

	return [...propSets.values()]
}

/**
 * Writes every rule the given components, themes, global styles and keyframes can produce into the
 * instance's sheet, then returns the whole sheet as css text.
 *
 * `sources` are the things to extract: pass module namespaces (`import * as styles from './styles'`)
 * or the values themselves. Plain objects and arrays are walked, so a namespace of components
 * works as well as one component.
 *
 * The result carries the same `--sxs` hydration markers server rendering writes. Served from the
 * same origin, the browser runtime reads those markers on startup, treats every rule in the file as
 * already injected, and only computes class names; anything not in the file (a `css` prop, a
 * component the walk did not reach) is injected at runtime as before.
 */
export const extractCss = (stitches: StitchesInstance, sources: readonly unknown[], { responsive = true }: ExtractOptions = {}): string => {
	const mediaNames = Object.keys(stitches.config.media)
	const seen = new Set<object>()

	const visit = (value: unknown, depth: number): void => {
		if ((typeof value !== 'object' && typeof value !== 'function') || value === null || seen.has(value)) return

		seen.add(value)

		if (isComposable(value)) {
			// Rendering through the instance's own css() gives the same class names and group positions
			// as rendering the component itself, including a styled component, which cannot be called.
			const render = stitches.css(value)

			for (const props of toPropSets(value[internal].composers, mediaNames, responsive)) {
				// A component wrapping a React component defers its rules until the injector renders.
				render(props).deferredInjector?.()
			}

			return
		}

		if (isTheme(value) || isSelfRendering(value)) {
			String(value)
			return
		}

		if (depth < maxWalkDepth && isWalkable(value)) {
			for (const member of Object.values(value)) visit(member, depth + 1)
		}
	}

	for (const source of sources) visit(source, 0)

	return stitches.getCssText()
}
