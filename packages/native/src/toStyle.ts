import type { NativeStyle, StyleObject, StyleValue, ThemeValues } from './types.ts'
import type { MediaContext } from './mediaContext.ts'
import { toNativeValue } from './values.ts'
import { coveredBy } from './shorthands.ts'

/** `$token` or `$scale$token`, the same spelling the web config uses. */
const reference = /\$(?:([\w-]+)\$)?([\w-]+)/g

/** A value that is exactly one reference. */
const wholeReference = /^\$(?:([\w-]+)\$)?([\w-]+)$/

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
const toValue = (property: string, value: string, context: StyleContext): StyleValue => {
	const scaleForProperty = context.themeMap[property]

	const tokenOf = (explicitScale: string | undefined, tokenName: string) => {
		const scaleName = explicitScale ?? scaleForProperty

		return scaleName === undefined ? undefined : context.theme[scaleName]?.[tokenName]
	}

	// A value that is one reference and nothing else takes the token as it is, which is how a platform
	// value (a dynamic color) reaches the style untouched.
	const whole = wholeReference.exec(value)

	if (whole) {
		const token = tokenOf(whole[1], whole[2])

		if (typeof token === 'object') return token
	}

	const resolved = value.replace(reference, (match: string, explicitScale: string | undefined, tokenName: string): string => {
		const token = tokenOf(explicitScale, tokenName)

		// A platform value cannot be written into a string; leaving the reference makes that visible.
		return token === undefined || typeof token === 'object' ? match : String(token)
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

		// A later shorthand overrides the longhands before it, as on the web; see shorthands.ts.
		for (const longhand of coveredBy(property)) delete into[longhand]

		into[property] = typeof value === 'string' ? toValue(property, value, context) : value
	}

	// Array.prototype.sort is stable, so blocks at the same position keep the order they were written in.
	for (const [, block] of blocks.sort(([left], [right]) => left - right)) toStyle(block, context, into)

	return into
}
