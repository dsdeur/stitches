import type { StitchesConfig, SheetGroup, ThemeResult, ThemeDefinition, CreateThemeFunction } from '../types.ts'
import { ThemeToken } from '../ThemeToken.ts'
import { createMemo } from '../utility/createMemo.ts'

import { toHash } from '../convert/toHash.ts'
import { toTailDashed } from '../convert/toTailDashed.ts'
import { toTokenizedValue } from '../convert/toTokenizedValue.ts'

const createCreateThemeFunctionMap = createMemo()

/** Returns a function that applies a theme and returns tokens of that theme. */
export const createCreateThemeFunction = (config: StitchesConfig, sheet: SheetGroup) =>
	createCreateThemeFunctionMap(
		config,
		(): CreateThemeFunction =>
			((className: string | ThemeDefinition, style?: ThemeDefinition): ThemeResult => {
				// theme is the first argument if it is an object, otherwise the second argument as an object
				style = (typeof className === 'object' && className) || Object(style)

				// class name is the first argument if it is a string, otherwise an empty string
				let resolvedClassName = typeof className === 'string' ? className : ''

				resolvedClassName = resolvedClassName || `${toTailDashed(config.prefix)}t-${toHash(style)}`

				const selector = `.${resolvedClassName}`

				const themeObject: Record<string, Record<string, ThemeToken>> = {}
				const cssProps: string[] = []

				for (const scale in style) {
					themeObject[scale] = {}

					for (const token in style[scale]) {
						const propertyName = `--${toTailDashed(config.prefix)}${scale}-${token}`
						const propertyValue = toTokenizedValue(String(style[scale][token]), config.prefix, scale)

						themeObject[scale][token] = new ThemeToken(token, propertyValue, scale, config.prefix)

						cssProps.push(`${propertyName}:${propertyValue}`)
					}
				}

				const render = (): string => {
					if (cssProps.length && !sheet.rules.themed.cache.has(resolvedClassName)) {
						sheet.rules.themed.cache.add(resolvedClassName)

						const rootPrelude = style === config.theme ? ':root,' : ''
						const cssText = `${rootPrelude}.${resolvedClassName}{${cssProps.join(';')}}`

						sheet.rules.themed.apply(cssText)
					}

					return resolvedClassName
				}

				return {
					...themeObject,
					get className() {
						return render()
					},
					selector,
					toString: render,
				} as ThemeResult
			}) as CreateThemeFunction,
	)
