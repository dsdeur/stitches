import { getCachedConfig } from './utility/getCachedConfig.ts'
import type { CSSObject, CssArg, ThemeDefinition, ThemeResult } from '../../core/src/types.ts'

export { createStitches } from './createStitches.ts'
export { defaultThemeMap } from '../../core/src/default/defaultThemeMap.ts'

export function createTheme(style: ThemeDefinition): ThemeResult
export function createTheme(className: string, style: ThemeDefinition): ThemeResult
export function createTheme(a: string | ThemeDefinition, b?: ThemeDefinition): ThemeResult {
	return b !== undefined ? getCachedConfig().createTheme(a as string, b) : getCachedConfig().createTheme(a as ThemeDefinition)
}

export const globalCss = (...styles: CSSObject[]) => getCachedConfig().globalCss(...styles)
export const keyframes = (style: CSSObject) => getCachedConfig().keyframes(style)
export const css = (...args: CssArg[]) => getCachedConfig().css(...args)
export const styled = (...args: CssArg[]) => getCachedConfig().styled(...args)
