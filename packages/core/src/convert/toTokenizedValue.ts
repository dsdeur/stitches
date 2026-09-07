import type { ThemeDefinition } from '../types.ts'
import { toTailDashed } from './toTailDashed.ts'
import { hasOwn } from '../utility/hasOwn.ts'

/**
 * Picks the scale a bare `$token` belongs to. A property can name several scales
 * (`border: ['borders', 'colors']`); the first one that actually defines the token wins, and the
 * first listed one is the fallback. The theme consulted is the default theme, so a scale that
 * only exists in a theme made with createTheme() cannot influence the choice; themes are
 * expected to share the shape of the default theme, since they are the same custom properties.
 */
const toScaleName = (scale: string | readonly string[], token: string, theme: ThemeDefinition): string => {
	if (typeof scale === 'string') return scale

	for (const name of scale) {
		const tokens = theme[name]

		if (tokens && hasOwn(tokens, token)) return name
	}

	return scale[0] ?? ''
}

/**
 * Returns a declaration value with transformed token values.
 * Quoted strings and `url(...)` are matched first and returned untouched, so a `$` or `--`
 * inside a URL or string literal is never mistaken for a token.
 */
export const toTokenizedValue = (value: string, prefix: string, scale: string | readonly string[], theme: ThemeDefinition = {}): string =>
	value.replace(/("[^"]*"|'[^']*'|url\([^)]*\))|([+-])?((?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)?(\$|--)([$\w-]+)/g, ($0: string, literal: string | undefined, direction: string, multiplier: string, separator: string, token: string) =>
		literal !== undefined
			? $0
			: (separator == '$') == !!multiplier
				? $0
				: (direction || separator == '--' ? 'calc(' : '') +
					('var(--' +
						(separator === '$' ? toTailDashed(prefix) + (!token.includes('$') ? toTailDashed(toScaleName(scale, token, theme)) : '') + token.replace(/\$/g, '-') : token) +
						')' +
						(direction || separator == '--' ? '*' + (direction || '') + (multiplier || '1') + ')' : '')),
	)
