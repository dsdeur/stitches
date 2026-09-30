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
	readonly config: { readonly media: {} }
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
