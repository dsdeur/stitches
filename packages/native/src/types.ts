/**
 * The style surface is deliberately structural for now: a property name maps to whatever React
 * Native accepts there, including the objects and arrays it takes for `shadowOffset` and
 * `transform`. Naming every RN property exactly, the way the web packages hand-write their CSS
 * types, is worth doing and is its own piece of work; see roadmap 5.3.
 */
export type StyleValue = string | number | boolean | null | undefined | readonly unknown[] | { readonly [key: string]: unknown }

/** A style object as written: values may be `$token` strings. */
export type StyleObject = { readonly [property: string]: StyleValue }

/** A style object as resolved: tokens replaced by their values, lengths as numbers. */
export type NativeStyle = { [property: string]: StyleValue }

export type ThemeDefinition = { readonly [scale: string]: { readonly [token: string]: string | number } }

/** A theme with every token resolved to a value. */
export type ThemeValues = { readonly [scale: string]: { readonly [token: string]: string | number } }

export type VariantDefinition = { readonly [variant: string]: { readonly [value: string]: StyleObject } }

/** One compound variant: the values that must all match, plus the style they add under `css`. */
export type CompoundVariant = { readonly [variant: string]: StyleObject | string | number | boolean | undefined } & { readonly css: StyleObject }

export interface ComposerDefinition extends StyleObject {
	readonly variants?: VariantDefinition
	readonly compoundVariants?: readonly CompoundVariant[]
	readonly defaultVariants?: { readonly [variant: string]: string | number | boolean }
}

/** A variant keyed by `true` or `false` takes a boolean, the way it does on the web. */
type VariantValue<Values> = [keyof Values & ('true' | 'false')] extends [never] ? keyof Values & (string | number) : boolean | (Exclude<keyof Values, 'true' | 'false'> & (string | number))

/**
 * The props a definition's variants accept.
 *
 * The first branch is what lets `css(base, { … })` keep the base's variants: what `css()` returned
 * is a function, and its own props are the variants it already carries.
 */
export type VariantSelection<Definition> = Definition extends { (props?: infer Props, ...rest: never[]): NativeStyle }
	? Omit<NonNullable<Props>, 'css'>
	: Definition extends { readonly variants: infer Variants }
		? { readonly [Variant in keyof Variants]?: VariantValue<Variants[Variant]> }
		: object

type UnionToIntersection<Union> = (Union extends unknown ? (of: Union) => void : never) extends (of: infer Intersection) => void ? Intersection : never

/** Every composer in a `css(a, b)` call contributes its variants. */
export type VariantsOf<Arguments extends readonly unknown[]> = UnionToIntersection<VariantSelection<Arguments[number]>>

export interface NativeConfig {
	readonly theme?: ThemeDefinition
	/** Which scale a bare `$token` resolves against, per property. Merged over the default map. */
	readonly themeMap?: { readonly [property: string]: string }
}

// `utils` is deliberately absent. A web config's utils expand into CSS properties
// (`marginInline`, `boxSizing`), which React Native does not have, so applying them here would
// produce styles RN drops silently. Native utils are their own decision; see roadmap 5.3.
