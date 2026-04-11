import type { StitchesConfig, CSSObject } from '../types.ts'
import { toCamelCase } from './toCamelCase.ts'
import { toHyphenCase } from './toHyphenCase.ts'
import { toPolyfilledValue } from './toPolyfilledValue.ts'
import { toResolvedMediaQueryRanges } from './toResolvedMediaQueryRanges.ts'
import { toResolvedSelectors } from './toResolvedSelectors.ts'
import { toSizingValue } from './toSizingValue.ts'
import { toTailDashed } from './toTailDashed.ts'
import { toTokenizedValue } from './toTokenizedValue.ts'

/** Comma matcher outside rounded brackets. */
const comma = /\s*,\s*(?![^()]*\))/

/** Default toString method of Objects. */
const toStringOfObject = Object.prototype.toString

export const toCssRules = (style: CSSObject, selectors: string[], conditions: string[], config: StitchesConfig, onCssText: (cssText: string) => void): void => {
	let currentRule: [string[], string[], string[]] | undefined = undefined

	let lastUtil: StitchesConfig['utils'][string] | null
	let lastPoly: ((d: string) => Record<string, string>) | null

	const walk = (style: CSSObject, selectors: string[], conditions: string[]): void => {
		let name: string
		let data: CSSObject[string]

		const each = (style: CSSObject): void => {
			for (name in style) {
				const isAtRuleLike = name.charCodeAt(0) === 64

				const rawValue = style[name]
				const datas = isAtRuleLike && Array.isArray(rawValue) ? rawValue : [rawValue]

				for (data of datas) {
					const camelName = toCamelCase(name)

					const isRuleLike = typeof data === 'object' && data && !Array.isArray(data) && data.toString === toStringOfObject && (!config.utils[camelName] || !selectors.length)

					if (camelName in config.utils && !isRuleLike) {
						const util = config.utils[camelName]

						if (util !== lastUtil) {
							lastUtil = util

							each(util(data as string | number))

							lastUtil = null

							continue
						}
					} else if (camelName in toPolyfilledValue) {
						const poly = toPolyfilledValue[camelName]

						if (poly !== lastPoly) {
							lastPoly = poly

							each(poly(data as string))

							lastPoly = null

							continue
						}
					}

					if (isAtRuleLike) {
						name = toResolvedMediaQueryRanges(name.slice(1) in config.media ? '@media ' + config.media[name.slice(1)] : name)
					}

					if (isRuleLike) {
						const nextConditions = isAtRuleLike ? conditions.concat(name) : [...conditions]
						const nextSelections = isAtRuleLike ? [...selectors] : toResolvedSelectors(selectors, name.split(comma))

						if (currentRule !== undefined) {
							onCssText(toCssString(...currentRule))
						}

						currentRule = undefined

						walk(data as CSSObject, nextSelections, nextConditions)
					} else {
						if (currentRule === undefined) currentRule = [[], selectors, conditions]

						name = !isAtRuleLike && name.charCodeAt(0) === 36 ? `--${toTailDashed(config.prefix)}${name.slice(1).replace(/\$/g, '-')}` : name

						const resolved = isRuleLike
							? data
							: typeof data === 'number'
								? data && !(camelName in unitlessProps) && !(name.charCodeAt(0) === 45)
									? String(data) + 'px'
									: String(data)
								: toTokenizedValue(toSizingValue(camelName, data == null ? '' : String(data)), config.prefix, config.themeMap[camelName])

						currentRule[0].push(`${isAtRuleLike ? `${name} ` : `${toHyphenCase(name)}:`}${resolved}`)
					}
				}
			}
		}

		each(style)

		if (currentRule !== undefined) {
			onCssText(toCssString(...currentRule))
		}
		currentRule = undefined
	}

	walk(style, selectors, conditions)
}

const toCssString = (declarations: string[], selectors: string[], conditions: string[]): string =>
	`${conditions.map((condition) => `${condition}{`).join('')}${selectors.length ? `${selectors.join(',')}{` : ''}${declarations.join(';')}${selectors.length ? `}` : ''}${Array(conditions.length ? conditions.length + 1 : 0).join('}')}`

/** CSS Properties whose number values should be unitless. */
export const unitlessProps: Record<string, number> = {
	animationIterationCount: 1,
	borderImageOutset: 1,
	borderImageSlice: 1,
	borderImageWidth: 1,
	boxFlex: 1,
	boxFlexGroup: 1,
	boxOrdinalGroup: 1,
	columnCount: 1,
	columns: 1,
	flex: 1,
	flexGrow: 1,
	flexPositive: 1,
	flexShrink: 1,
	flexNegative: 1,
	flexOrder: 1,
	gridRow: 1,
	gridRowEnd: 1,
	gridRowSpan: 1,
	gridRowStart: 1,
	gridColumn: 1,
	gridColumnEnd: 1,
	gridColumnSpan: 1,
	gridColumnStart: 1,
	msGridRow: 1,
	msGridRowSpan: 1,
	msGridColumn: 1,
	msGridColumnSpan: 1,
	fontWeight: 1,
	lineHeight: 1,
	opacity: 1,
	order: 1,
	orphans: 1,
	tabSize: 1,
	widows: 1,
	zIndex: 1,
	zoom: 1,
	WebkitLineClamp: 1,
	fillOpacity: 1,
	floodOpacity: 1,
	stopOpacity: 1,
	strokeDasharray: 1,
	strokeDashoffset: 1,
	strokeMiterlimit: 1,
	strokeOpacity: 1,
	strokeWidth: 1,
}
