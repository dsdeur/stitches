import { toTailDashed } from './toTailDashed.ts'

/** Returns a declaration value with transformed token values. */
export const toTokenizedValue = (value: string, prefix: string, scale: string): string =>
	value.replace(/([+-])?((?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)?(\$|--)([$\w-]+)/g, ($0: string, direction: string, multiplier: string, separator: string, token: string) =>
		(separator == '$') == !!multiplier
			? $0
			: (direction || separator == '--' ? 'calc(' : '') +
				('var(--' +
					(separator === '$' ? toTailDashed(prefix) + (!token.includes('$') ? toTailDashed(scale) : '') + token.replace(/\$/g, '-') : token) +
					')' +
					(direction || separator == '--' ? '*' + (direction || '') + (multiplier || '1') + ')' : '')),
	)
