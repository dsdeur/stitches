import type { ThemeDefinition, ThemeValues } from './types.ts'
import { toNativeValue } from './values.ts'

/**
 * Resolves a theme definition — the same object the web config takes — into plain values.
 *
 * Token references are resolved here rather than left for a renderer: `$colors$shadow` names a
 * scale and a token, a bare `$box` names a token of the scale being defined, and both may chain.
 * A reference the theme does not define is left as it was written, since a wrong guess would be
 * harder to notice than a visible `$name`.
 */
const reference = /\$(?:([\w-]+)\$)?([\w-]+)/g

export const toThemeValues = (...definitions: readonly (ThemeDefinition | undefined)[]): ThemeValues => {
	const merged = new Map<string, Map<string, string | number>>()

	for (const definition of definitions) {
		if (!definition) continue

		for (const [scaleName, scale] of Object.entries(definition)) {
			const tokens = merged.get(scaleName) ?? new Map<string, string | number>()

			for (const [tokenName, value] of Object.entries(scale)) tokens.set(tokenName, value)

			merged.set(scaleName, tokens)
		}
	}

	const lookup = (scaleName: string, tokenName: string): string | number | undefined => merged.get(scaleName)?.get(tokenName)

	const resolve = (value: string | number, scaleName: string, seen: ReadonlySet<string>): string | number => {
		if (typeof value === 'number') return value

		const resolved = value.replace(reference, (whole: string, explicitScale: string | undefined, tokenName: string): string => {
			const fromScale = explicitScale ?? scaleName
			const referenced = lookup(fromScale, tokenName)
			const key = `${fromScale}$${tokenName}`

			// A cycle would otherwise recurse forever; leaving the reference in place makes it visible.
			if (referenced === undefined || seen.has(key)) return whole

			return String(resolve(referenced, fromScale, new Set(seen).add(key)))
		})

		return toNativeValue(resolved)
	}

	const values: { [scale: string]: { [token: string]: string | number } } = {}

	for (const [scaleName, tokens] of merged) {
		const scale: { [token: string]: string | number } = {}

		for (const [tokenName, value] of tokens) scale[tokenName] = resolve(value, scaleName, new Set([`${scaleName}$${tokenName}`]))

		values[scaleName] = scale
	}

	return values
}
