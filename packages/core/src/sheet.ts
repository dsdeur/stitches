import type { SheetGroup, RuleGroup, SheetRule, GroupRule, InjectionDeferrer } from './types.ts'
import { getNonce } from './utility/getNonce.ts'

/**
 * Rules in the sheet appear in this order:
 * 1. theme rules (themed)
 * 2. global rules (global)
 * 3. component rules (styled)
 * 4. non-responsive variants rules (onevar)
 * 5. responsive variants rules (resonevar)
 * 6. compound variants rules (allvar)
 * 7. inline rules (inline)
 */
export const names = ['themed', 'global', 'styled', 'onevar', 'resonevar', 'allvar', 'inline'] as const

const isSheetAccessible = (sheet: CSSStyleSheet): boolean => {
	if (sheet.href && !sheet.href.startsWith(location.origin)) {
		return false
	}

	try {
		return !!sheet.cssRules
	} catch (e) {
		return false
	}
}

const getToString = (groupSheet: SheetGroup): (() => string) => {
	return (): string => {
		const { cssRules } = groupSheet.sheet
		return Array.from({ length: cssRules.length }, (_, i) => cssRules[i])
			.map((cssRule, cssRuleIndex) => {
				const cssText = cssRule.cssText

				let lastRuleCssText = ''

				if (cssText.startsWith('--sxs')) return ''

				const prevRule = cssRuleIndex > 0 ? cssRules[cssRuleIndex - 1] : undefined
				if (prevRule && (lastRuleCssText = prevRule.cssText).startsWith('--sxs')) {
					if (!cssRule.cssRules?.length) return ''

					for (const name in groupSheet.rules) {
						if (groupSheet.rules[name].group === cssRule) {
							return `--sxs{--sxs:${[...groupSheet.rules[name].cache].join(' ')}}${cssText}`
						}
					}

					return cssRule.cssRules?.length ? `${lastRuleCssText}${cssText}` : ''
				}

				return cssText
			})
			.join('')
	}
}

export const createSheet = (root: (DocumentOrShadowRoot & Node) | null): SheetGroup => {
	// groupSheet is initialized by reset() before createSheet returns.
	// We create the object upfront with a placeholder sheet, then reset() fills it in properly.
	const groupSheet: SheetGroup = {
		sheet: null as never, // overwritten by reset() below before any external access
		rules: {},
		reset: null as never, // overwritten below
		toString: null as never, // overwritten below
	}

	groupSheet.toString = getToString(groupSheet)

	const reset = (): void => {
		const { rules, sheet } = groupSheet

		if (sheet && !sheet.deleteRule) {
			// SSR mock path — cssRules has splice
			const mockRules = sheet.cssRules
			if (mockRules.splice) {
				while (Object(Object(mockRules)[0]).type === 3) mockRules.splice(0, 1)
				while (mockRules.length) mockRules.splice(0, 1)
			}
		}

		for (const groupName in rules) {
			delete rules[groupName]
		}

		const sheets: StyleSheetList | never[] = Object(root).styleSheets || []

		let foundHydrated = false

		// iterate all stylesheets until a hydratable stylesheet is found
		for (const existingSheet of sheets) {
			if (!isSheetAccessible(existingSheet)) continue

			for (let index = 0, cssRules = existingSheet.cssRules; cssRules[index]; ++index) {
				const check = cssRules[index]

				if (check.type !== 1) continue

				const group = cssRules[index + 1]

				if (!group || group.type !== 4) continue

				++index

				const { cssText } = check

				if (!cssText.startsWith('--sxs')) continue

				const cache = cssText.slice(14, -3).trim().split(/\s+/)

				const groupName = (names as readonly string[])[Number(cache[0])]

				if (!groupName) continue

				groupSheet.sheet = existingSheet
				groupSheet.rules[groupName] = { group: group as unknown as GroupRule, index, cache: new Set(cache), apply: noop }
				foundHydrated = true
			}

			if (foundHydrated) break
		}

		// if no hydratable stylesheet is found
		if (!foundHydrated) {
			const ruleTypeMap: Record<string, number> = { import: 3, undefined: 1 }

			const createMockRule = (sourceCssText: string, type: number | string): SheetRule & GroupRule => {
				const cssRules: (SheetRule & GroupRule)[] = []
				return {
					type,
					cssRules,
					insertRule(cssText: string, index: number) {
						const match = (cssText.toLowerCase().match(/^@([a-z]+)/) || [])[1]
						cssRules.splice(index, 0, createMockRule(cssText, ruleTypeMap[match] || 4))
					},
					get cssText() {
						return sourceCssText === '@media{}' ? `@media{${cssRules.map((r) => r.cssText).join('')}}` : sourceCssText
					},
				}
			}

			if (!root) {
				groupSheet.sheet = createMockRule('', 'text/css')
			} else {
				// A Document owns itself; a ShadowRoot (or element) points at its document. No global `document` or `Document` is used, so a custom root works outside a browser too.
				const ownerDocument = isDocument(root) ? root : root.ownerDocument
				const styleEl = ownerDocument ? ownerDocument.createElement('style') : null
				const nonce = getNonce()
				if (nonce && styleEl) {
					styleEl.setAttribute('nonce', nonce)
				}
				const parent = isDocument(root) ? root.head : root
				const appendedSheet = styleEl ? parent.appendChild(styleEl).sheet : null
				if (appendedSheet) {
					groupSheet.sheet = appendedSheet
				} else {
					groupSheet.sheet = createMockRule('', 'text/css')
				}
			}
		}

		const { sheet: currentSheet, rules: currentRules } = groupSheet
		for (let i = names.length - 1; i >= 0; --i) {
			const name = names[i]
			if (!currentRules[name]) {
				const prevName = names[i + 1]
				const index = currentRules[prevName] ? currentRules[prevName].index : currentSheet.cssRules.length
				currentSheet.insertRule('@media{}', index)
				currentSheet.insertRule(`--sxs{--sxs:${i}}`, index)
				currentRules[name] = { group: currentSheet.cssRules[index + 1] as unknown as GroupRule, index, cache: new Set([i]), apply: noop }
			}
			addApplyToGroup(currentRules[name])
		}
	}

	groupSheet.reset = reset

	reset()

	return groupSheet
}

const noop = () => undefined

/** Document nodes have nodeType 9; this avoids referencing the `Document` global, which does not exist outside browsers. */
const isDocument = (node: DocumentOrShadowRoot & Node): node is Document => node.nodeType === 9

const addApplyToGroup = (group: RuleGroup): void => {
	const groupingRule = group.group

	let index = groupingRule.cssRules.length

	group.apply = (cssText: string): void => {
		try {
			groupingRule.insertRule(cssText, index)
			++index
		} catch (__) {
			// do nothing and continue
		}
	}
}

/**
 * When a stitches component is extending some other random react component,
 * it's gonna create a react component (Injector) using this function and then render it after the children,
 * this way, we would force the styles of the wrapper to be injected after the wrapped component
 */
export const createRulesInjectionDeferrer = (globalSheet: SheetGroup): InjectionDeferrer => {
	let pending: [string, string][] = []

	const rules: Record<string, { apply: (rule: string) => void }> = {}
	names.forEach((sheetName) => {
		rules[sheetName] = { apply: (rule: string) => pending.push([sheetName, rule]) }
	})

	return Object.assign(
		function injector() {
			for (let i = 0; i < pending.length; i++) {
				const [sheet, cssString] = pending[i]
				globalSheet.rules[sheet].apply(cssString)
			}
			pending = []
			return null
		},
		{ rules },
	)
}
