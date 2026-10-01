import type { PlatformValue, ThemeValue, ThemeValues } from './types.ts'

/** Turns a light and a dark color into one the platform switches itself: iOS's `DynamicColorIOS` fits as is. */
export type ToDynamicColor = (colors: { readonly light: string; readonly dark: string }) => PlatformValue

export interface DynamicThemeOptions {
	/** The light theme. The instance's default theme unless given. */
	readonly light?: ThemeValues
	/** The scales that hold colors. Default `['colors']`. */
	readonly scales?: readonly string[]
}

/**
 * One theme for both appearances: every color token that differs between `light` and `dark` becomes
 * a platform color (`DynamicColorIOS` on iOS), which the platform resolves for the current
 * appearance, so switching between light and dark costs no JavaScript and no render.
 *
 * Only colors can switch that way. Any other token that differs between the two (a spacing, a shadow
 * string that embeds a color) cannot, so this throws and names it, rather than quietly using the
 * light value in dark mode. Keep such a token the same in both, or switch themes through the
 * Provider as before.
 */
export const toDynamicTheme = (light: ThemeValues, dark: ThemeValues, toDynamicColor: ToDynamicColor, scales: readonly string[] = ['colors']): ThemeValues => {
	const colorScales = new Set(scales)
	const result: { [scale: string]: { [token: string]: ThemeValue } } = {}

	for (const scale of new Set([...Object.keys(light), ...Object.keys(dark)])) {
		const lightScale = light[scale] ?? {}
		const darkScale = dark[scale] ?? {}
		const values: { [token: string]: ThemeValue } = {}

		for (const token of new Set([...Object.keys(lightScale), ...Object.keys(darkScale)])) {
			const lightValue = lightScale[token] ?? darkScale[token]
			const darkValue = darkScale[token] ?? lightScale[token]

			if (lightValue === darkValue) values[token] = lightValue
			else if (colorScales.has(scale) && typeof lightValue === 'string' && typeof darkValue === 'string') values[token] = toDynamicColor({ light: lightValue, dark: darkValue })
			else
				throw new Error(
					`dynamicTheme: ${scale}.${token} is ${JSON.stringify(lightValue)} in light and ${JSON.stringify(darkValue)} in dark, and only color tokens (scales: ${[...colorScales].join(', ')}) can follow the system appearance natively. Keep it the same in both themes, or switch themes through the Provider.`,
				)
		}

		result[scale] = values
	}

	return result
}
