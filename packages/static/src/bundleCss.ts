import type { StitchesInstance } from '../../core/src/types.ts'
import { extractCss, type ExtractOptions } from './extractCss.ts'
import { toPlainCss } from './toPlainCss.ts'
import { toUtilityClasses, toUtilityCss, type UtilityClass, type UtilityOptions } from './utilities.ts'

export interface BundleOptions extends ExtractOptions {
	/** Append the theme's utility classes after the components, so a utility can override a component style. On by default. */
	readonly utilities?: boolean | UtilityOptions
}

/** Every utility class the instance's theme yields, for an agent's prompt or a style guide. */
export const utilityClasses = (stitches: StitchesInstance, options?: UtilityOptions): UtilityClass[] => toUtilityClasses(stitches.config, options)

/** The instance's utility classes as css. Their values are the theme's custom properties, so the theme must be on the page too. */
export const utilityCss = (stitches: StitchesInstance, options?: UtilityOptions): string => toUtilityCss(stitches.config, toUtilityClasses(stitches.config, options))

/**
 * Everything as one plain stylesheet: themes, global styles, keyframes and every component rule
 * `extractCss` writes, then the utility classes. No hydration markers, so it is a file to cache, or
 * to inline into a single html page that needs no runtime at all. A page that does run the stitches
 * runtime should load `extractCss` output instead, which the runtime hydrates from.
 */
export const bundleCss = (stitches: StitchesInstance, sources: readonly unknown[], { utilities = true, ...extractOptions }: BundleOptions = {}): string => {
	const components = toPlainCss(extractCss(stitches, sources, extractOptions))

	if (utilities === false) return components

	return components + utilityCss(stitches, utilities === true ? {} : utilities)
}
