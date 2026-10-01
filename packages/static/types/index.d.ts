/**
 * Public types for @stitches/static. Hand-written like the other web packages' types: the source
 * works against core's internal instance type, while a consumer holds the public one that
 * `createStitches` from @stitches/core or @stitches/react returns. This names only what a caller
 * must provide, which both of those satisfy.
 */

export interface ExtractOptions {
	/**
	 * Also render every variant value, and every compound variant, at each breakpoint in
	 * `config.media`. On by default. A value placed at two breakpoints at once is its own class and
	 * is still injected at runtime.
	 */
	readonly responsive?: boolean
}

/** What `createStitches()` returns, from @stitches/core or @stitches/react. */
export interface StitchesInstanceLike {
	readonly config: { readonly prefix: string; readonly media: {}; readonly theme: {}; readonly themeMap: {} }
	/** The extractor renders every component through this; its full signature is core's. */
	css(...composers: never[]): unknown
	getCssText(): string
}

/**
 * Writes every rule the given components, themes, global styles and keyframes can produce into the
 * instance's sheet, and returns the whole sheet as css text, hydration markers included.
 *
 * `sources` are module namespaces (`import * as styles from './styles'`) or the values themselves.
 */
export declare function extractCss(stitches: StitchesInstanceLike, sources: readonly unknown[], options?: ExtractOptions): string

export interface UtilityOptions {
	/** The properties to write utilities for, by camelCase name. Every property in the config's `themeMap` by default. */
	readonly properties?: readonly string[]
	/** Also write each utility per breakpoint in `config.media`, as `tablet:padding-2`. On by default. */
	readonly responsive?: boolean
	/** Pseudo-classes to write each utility for, as `hover:color-primary`. None by default. */
	readonly states?: readonly string[]
	/** Put in front of the utility's own name, after any breakpoint or state. The config's `prefix` and a dash by default. */
	readonly prefix?: string
}

/** One utility class: what goes in a `class` attribute, and the declaration it applies. */
export interface UtilityClass {
	readonly className: string
	readonly property: string
	readonly value: string
	readonly media?: string
	readonly state?: string
}

export interface BundleOptions extends ExtractOptions {
	/** Append the theme's utility classes after the components. On by default. */
	readonly utilities?: boolean | UtilityOptions
}

/** Every utility class the instance's theme yields, for an agent's prompt or a style guide. */
export declare function utilityClasses(stitches: StitchesInstanceLike, options?: UtilityOptions): UtilityClass[]

/** The instance's utility classes as css. Values are the theme's custom properties. */
export declare function utilityCss(stitches: StitchesInstanceLike, options?: UtilityOptions): string

/**
 * Themes, global styles, keyframes, every component rule and the utility classes, as one plain
 * stylesheet without hydration markers: a file to cache, or to inline into a single html page.
 */
export declare function bundleCss(stitches: StitchesInstanceLike, sources: readonly unknown[], options?: BundleOptions): string

/** Strips the runtime's hydration markers and unconditional `@media{}` groups; rules and order are unchanged. */
export declare function toPlainCss(cssText: string): string
