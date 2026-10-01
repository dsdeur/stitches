import type { ComposerDefinition, CompoundVariant, NativeStyle, StyleObject, ThemeValues } from './types.ts'
import type { MediaContext } from './mediaContext.ts'
import { toStyle, type StyleContext } from './toStyle.ts'

export interface Composer {
	readonly definition: ComposerDefinition
	readonly variantNames: readonly string[]
}

export const toComposer = (definition: ComposerDefinition): Composer => ({
	definition,
	variantNames: Object.keys(definition.variants ?? {}),
})

const isRecord = (value: unknown): value is { readonly [key: string]: unknown } => typeof value === 'object' && value !== null && !Array.isArray(value)

const isStyleObject = (value: unknown): value is StyleObject => isRecord(value)

/**
 * The values each variant has right now, in the order they apply, as the strings a variant's keys
 * are written with. A plain prop gives one value; a responsive one, `{ '@initial': 'a', '@bp2': 'b' }`,
 * gives every value whose breakpoint holds, `@initial` first and then in `config.media` order. On
 * the web each of those is a rule of its own and all of them apply, so a property only the
 * `@initial` value sets survives a breakpoint whose value leaves it alone; merging them in that
 * order does the same here. `@initial` defaults to the default variant, as it does on the web.
 */
export const toSelection = (composers: readonly Composer[], variantNames: readonly string[], props: { readonly [key: string]: unknown }, media: MediaContext): Map<string, readonly string[]> => {
	const defaults = new Map<string, string>()

	for (const composer of composers) {
		for (const [variant, value] of Object.entries(composer.definition.defaultVariants ?? {})) defaults.set(variant, String(value))
	}

	const selection = new Map<string, readonly string[]>()

	for (const [variant, value] of defaults) selection.set(variant, [value])

	// Only declared variants: a styled component hands over all of its props, children and handlers included.
	for (const variant of variantNames) {
		const value = props[variant]

		if (value === undefined || value === null) continue

		if (!isRecord(value)) {
			selection.set(variant, [String(value)])
			continue
		}

		let initial = defaults.get(variant)
		const matched: [number, string][] = []

		for (const [key, entry] of Object.entries(value)) {
			if (entry === undefined || entry === null) continue

			if (key === '@initial') initial = String(entry)
			else if (media.matches(key)) matched.push([media.order(key), String(entry)])
		}

		// Array.prototype.sort is stable, so two raw queries keep the order they were written in.
		const ordered = matched.sort(([left], [right]) => left - right).map(([, entry]) => entry)

		selection.set(variant, initial === undefined ? ordered : [initial, ...ordered])
	}

	return selection
}

/**
 * Whether every variant this compound names has the value it asks for. A responsive prop counts
 * when any of its active values does, which is when the web's rule for it applies too. `css` is
 * the style, not a condition.
 */
const matches = (compound: CompoundVariant, selection: ReadonlyMap<string, readonly string[]>): boolean => {
	for (const [variant, expected] of Object.entries(compound)) {
		if (variant === 'css') continue
		if (!selection.get(variant)?.includes(String(expected))) return false
	}

	return true
}

/** A style that applies, and its place in the declared order: depth, kind, declaration, breakpoint, value. */
type Piece = readonly [depth: number, kind: number, declaration: number, breakpoint: number, value: number, style: StyleObject]

const comparePieces = (left: Piece, right: Piece): number => left[0] - right[0] || left[1] - right[1] || left[2] - right[2] || left[3] - right[3] || left[4] - right[4]

/**
 * Merges what applies in the order `cascade: 'declared'` puts it in on the web, so a style resolves
 * the same on both:
 *
 * 1. Composition depth: everything of a later composer beats everything of an earlier one, its
 *    variants included, so `styled(Base, { color })` overrides a `color` Base sets in a variant.
 * 2. Kind: base, then variants, then compound variants.
 * 3. Declaration order. A variant name is one declaration across depths: values an extension adds
 *    to an inherited variant sort with the variant, where it was first declared, after the
 *    inherited values.
 * 4. Breakpoints of one variant: `@initial` first, then `config.media` order.
 *
 * The `css` prop comes last of everything.
 */
export const render = (
	composers: readonly Composer[],
	variantNames: readonly string[],
	props: { readonly [key: string]: unknown },
	theme: ThemeValues,
	themeMap: { readonly [property: string]: string },
	media: MediaContext,
	overrides?: StyleObject,
): NativeStyle => {
	const context: StyleContext = { theme, themeMap, media }
	const selection = toSelection(composers, variantNames, props, media)
	const homes = new Map<string, { readonly depth: number; readonly index: number }>()
	const pieces: Piece[] = []

	composers.forEach((composer, depth) => {
		const { definition } = composer

		pieces.push([depth, 0, 0, 0, 0, definition])

		let valueIndex = 0

		composer.variantNames.forEach((name, index) => {
			let home = homes.get(name)

			if (!home) homes.set(name, (home = { depth, index }))

			const values = definition.variants?.[name] ?? {}

			;(selection.get(name) ?? []).forEach((selected, breakpoint) => {
				const match = values[selected]

				if (match) pieces.push([home.depth, 1, home.index, breakpoint, (depth - home.depth) * 1000 + valueIndex, match])
			})

			valueIndex += Object.keys(values).length
		})
		;(definition.compoundVariants ?? []).forEach((compound, index) => {
			if (matches(compound, selection) && isStyleObject(compound.css)) pieces.push([depth, 2, index, 0, 0, compound.css])
		})
	})

	const style: NativeStyle = {}

	for (const piece of pieces.sort(comparePieces)) toStyle(piece[5], context, style)

	// The `css` prop is last of everything, as it is on the web.
	if (overrides) toStyle(overrides, context, style)

	return style
}
