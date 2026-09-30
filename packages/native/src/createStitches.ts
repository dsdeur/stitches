import type { ComposerDefinition, NativeConfig, NativeStyle, StyleObject, ThemeDefinition, ThemeValues, VariantsOf, VariantSelection } from './types.ts'
import type { Viewport } from './media.ts'
import { defaultNativeThemeMap } from './defaultNativeThemeMap.ts'
import { toThemeValues } from './toThemeValues.ts'
import { toComposer, render, type Composer } from './createComposer.ts'
import { toMediaContext, toMediaTests } from './mediaContext.ts'

/** What `css()` returns: call it with variant props to get a React Native style object. */
export interface StyleFunction<Variants> {
	/**
	 * `theme` is the default theme unless given; `viewport` is the window size breakpoints are read
	 * against, and without it only `@initial` values and unconditional styles apply.
	 */
	(props?: Variants & { readonly css?: StyleObject }, theme?: ThemeValues, viewport?: Viewport): NativeStyle
	/** The composers behind it, so `css(other, { … })` can extend it. */
	readonly composers: readonly Composer[]
}

/** A definition, or something `css()` returned and is being extended. */
export type CssArgument = ComposerDefinition | StyleFunction<never>

/** The breakpoint names of a config, for typing responsive variant props. */
export type MediaOf<Config extends NativeConfig> = Config extends { readonly media: infer Media } ? keyof Media & string : never

export interface Stitches<Media extends string = never> {
	readonly css: <const Arguments extends readonly CssArgument[]>(...args: Arguments) => StyleFunction<VariantsOf<Arguments, Media>>
	/** The default theme, with every token resolved to a value. */
	readonly theme: ThemeValues
	/** Resolves another theme over the default one, for a dark mode or a brand. */
	readonly createTheme: (definition: ThemeDefinition) => ThemeValues
	readonly themeMap: { readonly [property: string]: string }
	readonly config: NativeConfig
}

const hasComposers = (value: CssArgument): value is StyleFunction<never> => typeof value === 'function'

const isRecord = (value: unknown): value is { readonly [key: string]: unknown } => typeof value === 'object' && value !== null && !Array.isArray(value)

/** Whether a style object anywhere in these definitions writes a raw `@media (…)` block. */
const hasRawQuery = (value: unknown): boolean => (isRecord(value) && Object.entries(value).some(([key, member]) => key.startsWith('@media') || hasRawQuery(member))) || (Array.isArray(value) && value.some(hasRawQuery))

/**
 * What `css()` and the React entry's `styled()` share: the config resolved once, and a way to turn a
 * list of definitions into a style function. The function takes any props object; `css()` narrows
 * that to the variants the definitions declare, which is only a matter of types.
 */
export interface StyleEngine {
	readonly config: NativeConfig
	readonly theme: ThemeValues
	readonly themeMap: { readonly [property: string]: string }
	readonly toStyleFunction: (args: readonly CssArgument[]) => StyleFunction<unknown>
	readonly createTheme: (definition: ThemeDefinition) => ThemeValues
}

export const createStyleEngine = (config: NativeConfig): StyleEngine => {
	const themeMap = { ...defaultNativeThemeMap, ...config.themeMap }
	const theme = toThemeValues(config.theme)
	const mediaTests = toMediaTests(config.media)

	const toStyleFunction = (args: readonly CssArgument[]): StyleFunction<unknown> => {
		const composers: Composer[] = []

		for (const argument of args) {
			if (hasComposers(argument)) composers.push(...argument.composers)
			else composers.push(toComposer(argument))
		}

		// A raw query's result is not part of the breakpoint signature, so such styles are not cached
		// per breakpoint once a viewport is in play.
		const writesRawQueries = composers.some((composer) => hasRawQuery(composer.definition))

		// One style object per theme, breakpoint signature and variant selection. Renders repeat far
		// more often than they vary, and React Native compares style objects by identity downstream.
		const cache = new WeakMap<ThemeValues, Map<string, NativeStyle>>()

		const style = (props: { readonly css?: StyleObject } = Object.create(null), activeTheme: ThemeValues = theme, viewport?: Viewport): NativeStyle => {
			const { css: overrides, ...variants } = props
			const media = toMediaContext(mediaTests, viewport)

			// An inline override is a new object every render, so caching on it would never hit.
			if (overrides) return render(composers, variants, activeTheme, themeMap, media, overrides)

			const selected = composers.flatMap((composer) => composer.variantNames.map((name) => Object.entries(variants).find(([variant]) => variant === name)?.[1] ?? null))

			if (viewport !== undefined && (writesRawQueries || JSON.stringify(selected).includes('"@media'))) return render(composers, variants, activeTheme, themeMap, media)

			const key = `${media.signature}${JSON.stringify(selected)}`
			const forTheme = cache.get(activeTheme) ?? new Map<string, NativeStyle>()
			const cached = forTheme.get(key)

			if (cached) return cached

			const rendered = render(composers, variants, activeTheme, themeMap, media)

			forTheme.set(key, rendered)
			cache.set(activeTheme, forTheme)

			return rendered
		}

		return Object.assign(style, { composers })
	}

	return {
		config,
		theme,
		themeMap,
		toStyleFunction,
		createTheme: (definition: ThemeDefinition): ThemeValues => toThemeValues(config.theme, definition),
	}
}

/**
 * The React Native half of stitches. It takes the same config object the web takes, so one theme,
 * one set of breakpoints and one set of variants serve both, and resolves everything to plain values
 * because native has no custom properties to defer to.
 */
export const createStitches = <const Config extends NativeConfig = NativeConfig>(init?: Config): Stitches<MediaOf<Config>> => {
	const engine = createStyleEngine(init ?? {})

	return {
		css: <const Arguments extends readonly CssArgument[]>(...args: Arguments): StyleFunction<VariantsOf<Arguments, MediaOf<Config>>> => engine.toStyleFunction(args),
		theme: engine.theme,
		createTheme: engine.createTheme,
		themeMap: engine.themeMap,
		config: engine.config,
	}
}

export type { VariantSelection }
