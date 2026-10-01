import type { ComposerDefinition, NativeConfig, NativeStyle, StyleObject, ThemeDefinition, ThemeValues, VariantsOf, VariantSelection } from './types.ts'
import type { Viewport } from './media.ts'
import { defaultNativeThemeMap } from './defaultNativeThemeMap.ts'
import { toThemeValues } from './toThemeValues.ts'
import { toComposer, render, type Composer } from './createComposer.ts'
import { toMediaContext, toMediaTests, type MediaContext } from './mediaContext.ts'

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

const isStyleObject = (value: unknown): value is StyleObject => isRecord(value)

/** Whether a style object anywhere in these definitions writes a raw `@media (…)` block. */
/** Whether a style object anywhere in these definitions has a breakpoint block, named or raw. */
export const hasBreakpoint = (value: unknown): boolean => (isRecord(value) && Object.entries(value).some(([key, member]) => key.startsWith('@') || hasBreakpoint(member))) || (Array.isArray(value) && value.some(hasBreakpoint))

const hasRawQuery = (value: unknown): boolean => (isRecord(value) && Object.entries(value).some(([key, member]) => key.startsWith('@media') || hasRawQuery(member))) || (Array.isArray(value) && value.some(hasRawQuery))

/** Props as the resolver reads them: any record. Only the declared variant names and `css` are read. */
export type PropsRecord = { readonly [key: string]: unknown }

/**
 * Resolves a style from props against a theme and an already computed media context. This is the
 * whole per-render cost of a styled component, so it reads only the declared variant names and
 * builds its cache key from them directly.
 */
export type Resolver = (props: PropsRecord, theme: ThemeValues, media: MediaContext) => NativeStyle

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
	/** The resolver behind a style function this engine made, so React can skip recomputing media per render. */
	readonly resolverOf: (style: object) => Resolver | undefined
	/**
	 * Whether a style function this engine made has a breakpoint anywhere in its definitions. One
	 * that does not can only depend on the window through a per-breakpoint prop, so React can leave
	 * it alone when the window changes.
	 */
	readonly hasBreakpoints: (style: object) => boolean
	/** Which breakpoints hold for a viewport, computed once per window size rather than per render. */
	readonly mediaFor: (viewport: Viewport | undefined) => MediaContext
	readonly createTheme: (definition: ThemeDefinition) => ThemeValues
}

/**
 * A responsive prop value is keyed by its JSON, through an object per distinct JSON, so it can never
 * share a key with a plain string prop that happens to read the same.
 */
const responsiveKeys = new Map<string, object>()

const responsiveKey = (json: string): object => {
	let key = responsiveKeys.get(json)

	if (!key) responsiveKeys.set(json, (key = {}))

	return key
}

/** One level of a style function's cache: the style for the selection so far, and the next variant's values. */
interface CacheNode {
	style?: NativeStyle
	readonly next: Map<unknown, CacheNode>
}

/** Whether a responsive prop value writes a raw `@media (…)` key, whose result the breakpoint signature does not capture. */
const hasRawKey = (value: PropsRecord): boolean => {
	for (const key in value) if (key.startsWith('@media')) return true

	return false
}

export const createStyleEngine = (config: NativeConfig): StyleEngine => {
	const themeMap = { ...defaultNativeThemeMap, ...config.themeMap }
	const theme = toThemeValues(config.theme)
	const mediaTests = toMediaTests(config.media)
	const initialMedia = toMediaContext(mediaTests, undefined)

	// The window size changes rarely and every render asks again, so the last answer is kept.
	let lastViewport: Viewport | undefined
	let lastMedia = initialMedia

	const mediaFor = (viewport: Viewport | undefined): MediaContext => {
		if (viewport === undefined) return initialMedia
		if (lastViewport !== undefined && lastViewport.width === viewport.width && lastViewport.height === viewport.height) return lastMedia

		lastViewport = { width: viewport.width, height: viewport.height }
		lastMedia = toMediaContext(mediaTests, lastViewport)

		return lastMedia
	}

	const resolvers = new WeakMap<object, Resolver>()
	const withBreakpoints = new WeakSet<object>()

	const toStyleFunction = (args: readonly CssArgument[]): StyleFunction<unknown> => {
		const composers: Composer[] = []

		for (const argument of args) {
			if (hasComposers(argument)) composers.push(...argument.composers)
			else composers.push(toComposer(argument))
		}

		const variantNames = [...new Set(composers.flatMap((composer) => composer.variantNames))]

		// A raw query's result is not part of the breakpoint signature, so such styles are not cached
		// per breakpoint once a viewport is in play.
		const writesRawQueries = composers.some((composer) => hasRawQuery(composer.definition))

		// One style object per theme, breakpoint signature and variant selection. Renders repeat far
		// more often than they vary, and React Native compares style objects by identity downstream.
		// The cache is a tree: theme, then breakpoint signature, then one level per variant keyed by
		// the prop value itself, so a warm render does a few Map lookups and builds no string.
		const cache = new WeakMap<ThemeValues, Map<string, CacheNode>>()
		let lastTheme: ThemeValues | undefined
		let lastBySignature: Map<string, CacheNode> | undefined

		const resolve: Resolver = (props, activeTheme, media) => {
			const overrides = props.css

			// An inline override is a new object every render, so caching on it would never hit.
			if (isStyleObject(overrides)) return render(composers, variantNames, props, activeTheme, themeMap, media, overrides)

			// A raw query's result is not part of the breakpoint signature.
			if (writesRawQueries && media !== initialMedia) return render(composers, variantNames, props, activeTheme, themeMap, media)

			let bySignature = activeTheme === lastTheme ? lastBySignature : cache.get(activeTheme)

			if (!bySignature) cache.set(activeTheme, (bySignature = new Map<string, CacheNode>()))

			lastTheme = activeTheme
			lastBySignature = bySignature

			let node = bySignature.get(media.signature)

			if (!node) bySignature.set(media.signature, (node = { next: new Map() }))

			for (const name of variantNames) {
				const value = props[name]
				let key: unknown = value ?? undefined

				if (isRecord(value)) {
					if (media !== initialMedia && hasRawKey(value)) return render(composers, variantNames, props, activeTheme, themeMap, media)

					key = responsiveKey(JSON.stringify(value))
				}

				let child = node.next.get(key)

				if (!child) node.next.set(key, (child = { next: new Map() }))

				node = child
			}

			return node.style ?? (node.style = render(composers, variantNames, props, activeTheme, themeMap, media))
		}

		const style = (props: { readonly css?: StyleObject } = Object.create(null), activeTheme: ThemeValues = theme, viewport?: Viewport): NativeStyle => resolve(isRecord(props) ? props : {}, activeTheme, mediaFor(viewport))

		const styleFunction = Object.assign(style, { composers })

		resolvers.set(styleFunction, resolve)
		if (composers.some((composer) => hasBreakpoint(composer.definition))) withBreakpoints.add(styleFunction)

		return styleFunction
	}

	return {
		config,
		theme,
		themeMap,
		toStyleFunction,
		resolverOf: (style) => resolvers.get(style),
		hasBreakpoints: (style) => withBreakpoints.has(style),
		mediaFor,
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
