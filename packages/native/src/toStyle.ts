import type { NativeStyle, StyleObject, ThemeValues } from './types.ts'
import { toNativeValue } from './values.ts'

/** `$token` or `$scale$token`, the same spelling the web config uses. */
const reference = /\$(?:([\w-]+)\$)?([\w-]+)/g

const structural = new Set(['variants', 'compoundVariants', 'defaultVariants'])

export interface StyleContext {
	readonly theme: ThemeValues
	readonly themeMap: { readonly [property: string]: string }
}

/**
 * Resolves one style value. A bare `$token` needs the property's scale, which is what themeMap is
 * for; an explicit `$scale$token` always resolves. A reference with no scale to resolve against,
 * or one the theme does not define, is left as written rather than guessed at.
 */
const toValue = (property: string, value: string, context: StyleContext): string | number => {
	const scaleForProperty = context.themeMap[property]

	const resolved = value.replace(reference, (whole: string, explicitScale: string | undefined, tokenName: string): string => {
		const scaleName = explicitScale ?? scaleForProperty

		if (scaleName === undefined) return whole

		const token = context.theme[scaleName]?.[tokenName]

		return token === undefined ? whole : String(token)
	})

	return toNativeValue(resolved)
}

/**
 * Flattens one style object into React Native's shape: tokens resolved, lengths turned into
 * numbers. Values React Native takes as objects or arrays (`shadowOffset`, `transform`) are
 * passed through untouched.
 */
export const toStyle = (definition: StyleObject, context: StyleContext, into: NativeStyle = {}): NativeStyle => {
	for (const [property, value] of Object.entries(definition)) {
		if (structural.has(property) || value === undefined) continue

		into[property] = typeof value === 'string' ? toValue(property, value, context) : value
	}

	return into
}
