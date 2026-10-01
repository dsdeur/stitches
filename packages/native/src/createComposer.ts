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

/**
 * Applies one composer in the order the cascade rules describe: base first, then variants in the
 * order they were declared, then compound variants in array order. Later assignments win, so what
 * you wrote last wins — the same result `cascade: 'declared'` gives on the web.
 */
const applyComposer = (composer: Composer, selection: ReadonlyMap<string, readonly string[]>, context: StyleContext, into: NativeStyle): void => {
	const { definition } = composer

	toStyle(definition, context, into)

	for (const [variant, values] of Object.entries(definition.variants ?? {})) {
		for (const selected of selection.get(variant) ?? []) {
			const match = values[selected]

			if (match) toStyle(match, context, into)
		}
	}

	for (const compound of definition.compoundVariants ?? []) {
		if (!matches(compound, selection)) continue
		if (isStyleObject(compound.css)) toStyle(compound.css, context, into)
	}
}

/**
 * Composition depth decides first: everything of a later composer beats everything of an earlier
 * one, its variants included. `styled(Base, { color })` therefore overrides a `color` that Base
 * sets in a variant — the case that needs `!important` under the web's legacy cascade.
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
	const style: NativeStyle = {}

	for (const composer of composers) applyComposer(composer, selection, context, style)

	// The `css` prop is last of everything, as it is on the web.
	if (overrides) toStyle(overrides, context, style)

	return style
}
