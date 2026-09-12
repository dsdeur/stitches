import type { ComposerDefinition, NativeConfig, NativeStyle, StyleObject, ThemeDefinition, ThemeValues, VariantsOf, VariantSelection } from './types.ts'
import { defaultNativeThemeMap } from './defaultNativeThemeMap.ts'
import { toThemeValues } from './toThemeValues.ts'
import { toComposer, render, type Composer } from './createComposer.ts'

/** What `css()` returns: call it with variant props to get a React Native style object. */
export interface StyleFunction<Variants> {
	(props?: Variants & { readonly css?: StyleObject }, theme?: ThemeValues): NativeStyle
	/** The composers behind it, so `css(other, { … })` can extend it. */
	readonly composers: readonly Composer[]
}

/** A definition, or something `css()` returned and is being extended. */
export type CssArgument = ComposerDefinition | StyleFunction<never>

export interface Stitches {
	readonly css: <const Arguments extends readonly CssArgument[]>(...args: Arguments) => StyleFunction<VariantsOf<Arguments>>
	/** The default theme, with every token resolved to a value. */
	readonly theme: ThemeValues
	/** Resolves another theme over the default one, for a dark mode or a brand. */
	readonly createTheme: (definition: ThemeDefinition) => ThemeValues
	readonly themeMap: { readonly [property: string]: string }
	readonly config: NativeConfig
}

const hasComposers = (value: CssArgument): value is StyleFunction<never> => typeof value === 'function'

/**
 * The React Native half of stitches. It takes the same config object the web takes, so one theme
 * and one set of variants serve both, and resolves everything to plain values because native has
 * no custom properties to defer to.
 */
export const createStitches = (config: NativeConfig = {}): Stitches => {
	const themeMap = { ...defaultNativeThemeMap, ...config.themeMap }
	const theme = toThemeValues(config.theme)

	const css = <const Arguments extends readonly CssArgument[]>(...args: Arguments): StyleFunction<VariantsOf<Arguments>> => {
		const composers: Composer[] = []

		for (const argument of args) {
			if (hasComposers(argument)) composers.push(...argument.composers)
			else composers.push(toComposer(argument))
		}

		// One style object per theme and variant selection. Renders repeat far more often than they
		// vary, and React Native compares style objects by identity downstream.
		const cache = new WeakMap<ThemeValues, Map<string, NativeStyle>>()

		const style = (props: VariantsOf<Arguments> & { readonly css?: StyleObject } = Object.create(null), activeTheme: ThemeValues = theme): NativeStyle => {
			const { css: overrides, ...variants } = props

			// An inline override is a new object every render, so caching on it would never hit.
			if (overrides) return render(composers, variants, activeTheme, themeMap, overrides)

			const key = JSON.stringify(composers.flatMap((composer) => composer.variantNames.map((name) => Object.entries(variants).find(([variant]) => variant === name)?.[1] ?? null)))
			const forTheme = cache.get(activeTheme) ?? new Map<string, NativeStyle>()
			const cached = forTheme.get(key)

			if (cached) return cached

			const rendered = render(composers, variants, activeTheme, themeMap)

			forTheme.set(key, rendered)
			cache.set(activeTheme, forTheme)

			return rendered
		}

		return Object.assign(style, { composers })
	}

	return {
		css,
		theme,
		createTheme: (definition: ThemeDefinition): ThemeValues => toThemeValues(config.theme, definition),
		themeMap,
		config,
	}
}

export type { VariantSelection }
