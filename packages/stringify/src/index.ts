import { toKebabCase } from './toCase.ts'
import { getResolvedSelectors } from './getResolvedSelectors.ts'
import { isArray } from './Array.ts'

const {
	prototype: { toString },
} = Object

/** Comma matcher outside rounded brackets. */
const comma = /\s*,\s*(?![^()]*\))/

/** CSS style object type — values can be strings, numbers, or nested objects */
type CSSStyleObject = Record<string, unknown>

/** Returns a string of CSS from an object of CSS. */
export const stringify = (
	/** Object representing the current CSS. */
	value: CSSStyleObject,
	/** Replacer function. */
	replacer: ((name: string, data: unknown, style: CSSStyleObject) => unknown) | undefined = undefined,
): string => {
	/** Set used to manage the opened and closed state of rules. */
	const used = new WeakSet()

	const parse = (style: CSSStyleObject, selectors: string[], conditions: object[], prevName?: string, prevData?: unknown): string => {
		let cssText = ''

		each: for (const name in style) {
			const isAtRuleLike = name.charCodeAt(0) === 64

			for (const data of isAtRuleLike && isArray(style[name]) ? style[name] : [style[name]]) {
				if (replacer && (name !== prevName || data !== prevData)) {
					const next = replacer(name, data, style)

					if (next !== null) {
						cssText += typeof next === 'object' && next ? parse(next as CSSStyleObject, selectors, conditions, name, data) : next == null ? '' : next

						continue each
					}
				}

				const isObjectLike = typeof data === 'object' && data && data.toString === toString

				if (isObjectLike) {
					if (used.has(selectors)) {
						used.delete(selectors)

						cssText += '}'
					}

					const usedName = Object(name) as object

					const nextSelectors = isAtRuleLike ? selectors : selectors.length ? getResolvedSelectors(selectors, name.split(comma)) : name.split(comma)

					cssText += parse(data, nextSelectors, isAtRuleLike ? conditions.concat(usedName) : conditions)

					if (used.has(usedName)) {
						used.delete(usedName)
						cssText += '}'
					}

					if (used.has(nextSelectors)) {
						used.delete(nextSelectors)
						cssText += '}'
					}
				} else {
					for (let i = 0; i < conditions.length; ++i) {
						if (!used.has(conditions[i])) {
							used.add(conditions[i])

							cssText += conditions[i] + '{'
						}
					}

					if (selectors.length && !used.has(selectors)) {
						used.add(selectors)

						cssText += selectors + '{'
					}

					cssText += (isAtRuleLike ? name + ' ' : toKebabCase(name) + ':') + String(data) + ';'
				}
			}
		}

		return cssText
	}

	return parse(value, [], [])
}
