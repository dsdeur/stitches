import type { ComposerDefinition, CompoundVariant, NativeStyle, StyleObject, ThemeValues } from './types.ts'
import { toStyle, type StyleContext } from './toStyle.ts'

export interface Composer {
	readonly definition: ComposerDefinition
	readonly variantNames: readonly string[]
}

export const toComposer = (definition: ComposerDefinition): Composer => ({
	definition,
	variantNames: Object.keys(definition.variants ?? {}),
})

const isStyleObject = (value: unknown): value is StyleObject => typeof value === 'object' && value !== null

/**
 * The variant values in play, as the strings a variant's keys are written with: what was passed,
 * over the defaults of every composer. `true` selects the `true` key, the way it does on the web.
 */
export const toSelection = (composers: readonly Composer[], props: object): Map<string, string> => {
	const selection = new Map<string, string>()

	for (const composer of composers) {
		for (const [variant, value] of Object.entries(composer.definition.defaultVariants ?? {})) selection.set(variant, String(value))
	}

	for (const [variant, value] of Object.entries(props)) {
		if (value !== undefined && value !== null) selection.set(variant, String(value))
	}

	return selection
}

/** Whether every variant this compound names is currently selected. `css` is the style, not a condition. */
const matches = (compound: CompoundVariant, selection: ReadonlyMap<string, string>): boolean => {
	for (const [variant, expected] of Object.entries(compound)) {
		if (variant === 'css') continue
		if (selection.get(variant) !== String(expected)) return false
	}

	return true
}

/**
 * Applies one composer in the order the cascade rules describe: base first, then variants in the
 * order they were declared, then compound variants in array order. Later assignments win, so what
 * you wrote last wins — the same result `cascade: 'declared'` gives on the web.
 */
const applyComposer = (composer: Composer, selection: ReadonlyMap<string, string>, context: StyleContext, into: NativeStyle): void => {
	const { definition } = composer

	toStyle(definition, context, into)

	for (const [variant, values] of Object.entries(definition.variants ?? {})) {
		const selected = selection.get(variant)

		if (selected === undefined) continue

		const match = values[selected]

		if (match) toStyle(match, context, into)
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
export const render = (composers: readonly Composer[], props: object, theme: ThemeValues, themeMap: { readonly [property: string]: string }, overrides?: StyleObject): NativeStyle => {
	const context: StyleContext = { theme, themeMap }
	const selection = toSelection(composers, props)
	const style: NativeStyle = {}

	for (const composer of composers) applyComposer(composer, selection, context, style)

	// The `css` prop is last of everything, as it is on the web.
	if (overrides) toStyle(overrides, context, style)

	return style
}
