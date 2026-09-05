import { toTailDashed } from './toTailDashed.ts'

/**
 * Returns a declaration value with transformed token values.
 * Quoted strings and `url(...)` are matched first and returned untouched, so a `$` or `--`
 * inside a URL or string literal is never mistaken for a token.
 */
export const toTokenizedValue = (value: string, prefix: string, scale: string): string =>
	value.replace(/("[^"]*"|'[^']*'|url\([^)]*\))|([+-])?((?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)?(\$|--)([$\w-]+)/g, ($0: string, literal: string | undefined, direction: string, multiplier: string, separator: string, token: string) =>
		literal !== undefined
			? $0
			: (separator == '$') == !!multiplier
				? $0
				: (direction || separator == '--' ? 'calc(' : '') +
					('var(--' +
						(separator === '$' ? toTailDashed(prefix) + (!token.includes('$') ? toTailDashed(scale) : '') + token.replace(/\$/g, '-') : token) +
						')' +
						(direction || separator == '--' ? '*' + (direction || '') + (multiplier || '1') + ')' : '')),
	)
