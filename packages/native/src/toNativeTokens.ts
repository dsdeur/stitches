import { toNativeValue } from './values.ts'

/**
 * Turns a stitches theme into plain values a non-CSS renderer can use.
 *
 * A theme token's runtime `value` is the CSS value, which means references to other tokens are
 * already `var(--scale-token)` by the time we see them: the browser resolves those. React Native
 * has no such indirection, so this resolves them itself against the same theme.
 */

/** The runtime shape of one stitches theme token. */
export interface ThemeTokenLike {
	readonly token: string | number
	readonly value: string | number
	readonly scale: string
	readonly prefix: string
}

/** What one token becomes: a number for lengths and unitless values, a string for everything else. */
export type NativeValue = string | number

/**
 * The shape of `toNativeTokens(theme)`, keeping the theme's scales and token names.
 *
 * A theme is a string intersection (it serializes to its class name), so `keyof` also yields
 * `className`, `selector` and every String member. Only the scales survive the filter.
 */
export type NativeTokensOf<Theme> = {
	[Scale in keyof Theme as Theme[Scale] extends Readonly<Record<string, ThemeTokenLike>> ? Scale : never]: {
		[Token in keyof Theme[Scale]]: NativeValue
	}
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === 'object' && value !== null

const isThemeToken = (value: unknown): value is ThemeTokenLike => {
	if (!isRecord(value)) return false

	const { token, value: tokenValue, scale, prefix } = value

	return (typeof token === 'string' || typeof token === 'number') && (typeof tokenValue === 'string' || typeof tokenValue === 'number') && typeof scale === 'string' && typeof prefix === 'string'
}

/** A scale is a record whose every member is a token; `className`, `selector` and `toString` are not. */
const isScale = (value: unknown): value is Readonly<Record<string, ThemeTokenLike>> => {
	if (!isRecord(value)) return false

	const tokens = Object.values(value)

	return tokens.length > 0 && tokens.every(isThemeToken)
}

/** The custom property a token serializes to, built the same way `ThemeToken.variable` builds it. */
const toVariable = (token: ThemeTokenLike): string => `--${token.prefix ? `${token.prefix}-` : ''}${token.scale ? `${token.scale}-` : ''}${token.token}`

/** `var(--name)` or `var(--name, fallback)`. A nested var() inside a fallback is left alone. */
const variableReference = /var\(\s*(--[\w-]+)\s*(?:,([^()]*))?\)/g

/**
 * Replaces every `var()` with the value of the token it names, repeatedly, since a token's value
 * can itself reference another. A reference to a token this theme does not define is left as it is
 * rather than guessed at, and such a value is never coerced to a number.
 */
const resolve = (value: string, byVariable: ReadonlyMap<string, string>, seen: ReadonlySet<string>): string =>
	value.replace(variableReference, (whole: string, name: string, fallback: string | undefined): string => {
		const referenced = byVariable.get(name)

		// A cycle would otherwise recurse forever; leaving the var() in place makes it visible.
		if (referenced === undefined || seen.has(name)) return fallback === undefined ? whole : resolve(fallback.trim(), byVariable, seen)

		return resolve(referenced, byVariable, new Set(seen).add(name))
	})

/**
 * Flattens one or more stitches themes into plain values, later themes overriding earlier ones.
 *
 * ```ts
 * const light = toNativeTokens(theme)
 * const dark = toNativeTokens(theme, darkTheme)
 * ```
 *
 * The second form matters: `createTheme()` returns only the tokens it overrides, so a dark theme
 * on its own is missing most of the set.
 */
export const toNativeTokens = <Theme extends object>(theme: Theme, ...overrides: readonly object[]): NativeTokensOf<Theme> => {
	const merged = new Map<string, Map<string, ThemeTokenLike>>()

	for (const source of [theme, ...overrides]) {
		for (const [scaleName, scale] of Object.entries(source)) {
			if (!isScale(scale)) continue

			const tokens = merged.get(scaleName) ?? new Map<string, ThemeTokenLike>()

			for (const [tokenName, token] of Object.entries(scale)) tokens.set(tokenName, token)

			merged.set(scaleName, tokens)
		}
	}

	const byVariable = new Map<string, string>()

	for (const tokens of merged.values()) {
		for (const token of tokens.values()) byVariable.set(toVariable(token), String(token.value))
	}

	const native: Record<string, Record<string, NativeValue>> = {}

	for (const [scaleName, tokens] of merged) {
		const scale: Record<string, NativeValue> = {}

		for (const [tokenName, token] of tokens) {
			scale[tokenName] = toNativeValue(resolve(String(token.value), byVariable, new Set([toVariable(token)])))
		}

		native[scaleName] = scale
	}

	// The result is built at runtime from the theme's own keys, so nothing here can prove to the
	// compiler that it matches the mapped type derived from `Theme`. The keys are the theme's keys
	// by construction, which is exactly what NativeTokensOf describes.
	return native as NativeTokensOf<Theme>
}
