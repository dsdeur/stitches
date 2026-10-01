import type { NativeStyle, StyleObject, ThemeValues } from './types.ts'
import type { MediaContext } from './mediaContext.ts'
import { toNativeValue } from './values.ts'

/** `$token` or `$scale$token`, the same spelling the web config uses. */
const reference = /\$(?:([\w-]+)\$)?([\w-]+)/g

const structural = new Set(['variants', 'compoundVariants', 'defaultVariants'])

export interface StyleContext {
	readonly theme: ThemeValues
	readonly themeMap: { readonly [property: string]: string }
	readonly media: MediaContext
}

const isStyleObject = (value: unknown): value is StyleObject => typeof value === 'object' && value !== null && !Array.isArray(value)

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
 *
 * A `'@bp1': { … }` block applies when its breakpoint matches, after the plain properties of the
 * same object, the way the web writes it as a media rule after the declarations it overrides.
 * Blocks follow `config.media` order, as the web's declared cascade orders one style's breakpoints.
 */
export const toStyle = (definition: StyleObject, context: StyleContext, into: NativeStyle = {}): NativeStyle => {
	const blocks: [number, StyleObject][] = []

	for (const [property, value] of Object.entries(definition)) {
		if (structural.has(property) || value === undefined) continue

		if (property.startsWith('@')) {
			if (isStyleObject(value) && context.media.matches(property)) blocks.push([context.media.order(property), value])
			continue
		}

		into[property] = typeof value === 'string' ? toValue(property, value, context) : value
	}

	// Array.prototype.sort is stable, so blocks at the same position keep the order they were written in.
	for (const [, block] of blocks.sort(([left], [right]) => left - right)) toStyle(block, context, into)

	return into
}
