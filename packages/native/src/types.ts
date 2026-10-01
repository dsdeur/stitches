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
 * A variant prop, plain or per breakpoint: `size="large"` or `size={{ '@initial': 'small', '@bp2': 'large' }}`,
 * with the breakpoint names of the config, and raw `@media (…)` queries as the web allows.
 */
export type ResponsiveValue<Value, Media extends string> = Value | ({ readonly [Key in '@initial' | `@${Media}`]?: Value } & { readonly [query: `@media ${string}`]: Value | undefined })

/** The props a style function accepts, without the `css` override. */
type StyleFunctionProps<Function> = Function extends { (props?: infer Props, ...rest: never[]): NativeStyle } ? Omit<NonNullable<Props>, 'css'> : never

/**
 * The props a definition's variants accept.
 *
 * The first two branches are what let `css(base, { … })` and `styled(Base, { … })` keep the base's
 * variants: what `css()` returned is a function whose props are the variants it already carries,
 * and a styled component carries that function as `style`.
 */
export type VariantSelection<Definition, Media extends string> = Definition extends { (props?: infer Props, ...rest: never[]): NativeStyle }
	? Omit<NonNullable<Props>, 'css'>
	: Definition extends { readonly style: infer Function }
		? StyleFunctionProps<Function>
		: Definition extends { readonly variants: infer Variants }
			? { readonly [Variant in keyof Variants]?: ResponsiveValue<VariantValue<Variants[Variant]>, Media> }
			: object

/** Every key of every member of a union. */
type KeysOfUnion<Union> = Union extends unknown ? keyof Union : never

/** The plain values a key takes in any member of a union, without the per-breakpoint object form. */
type ValuesOfUnion<Union, Key extends PropertyKey> = Union extends unknown ? (Key extends keyof Union ? Exclude<NonNullable<Union[Key]>, object> : never) : never

/**
 * Every composer in a `css(a, b)` call contributes its variants. A variant several composers declare
 * takes the values of all of them: an extension adding `loud` to an inherited `tone` accepts both.
 */
export type VariantsOf<Arguments extends readonly unknown[], Media extends string> = {
	readonly [Variant in KeysOfUnion<VariantSelection<Arguments[number], Media>>]?: ResponsiveValue<ValuesOfUnion<VariantSelection<Arguments[number], Media>, Variant>, Media>
}

export interface NativeConfig {
	readonly theme?: ThemeDefinition
	/**
	 * The web config's breakpoints, read against the window size: `min-`/`max-` width and height,
	 * range syntax, `orientation`, `and` and commas. See media.ts for what never matches.
	 */
	readonly media?: { readonly [name: string]: string }
	/** Which scale a bare `$token` resolves against, per property. Merged over the default map. */
	readonly themeMap?: { readonly [property: string]: string }
}

// `utils` is deliberately absent. A web config's utils expand into CSS properties
// (`marginInline`, `boxSizing`), which React Native does not have, so applying them here would
// produce styles RN drops silently. Native utils are their own decision; see roadmap 5.3.
