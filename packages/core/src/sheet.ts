import type { SheetGroup, RuleGroup, SheetRule, GroupRule, InjectionDeferrer, Cascade, RuleKind } from './types.ts'
import { getNonce } from './utility/getNonce.ts'

/**
 * Legacy cascade (the 1.x behavior). Rules in the sheet appear in this order:
 * 1. theme rules (themed)
 * 2. global rules (global)
 * 3. component rules (styled)
 * 4. non-responsive variants rules (onevar)
 * 5. responsive variants rules (resonevar)
 * 6. compound variants rules (allvar)
 * 7. inline rules (inline)
 * Within a group, rules are appended in the order they are first rendered.
 */
export const legacyNames: readonly string[] = ['themed', 'global', 'styled', 'onevar', 'resonevar', 'allvar', 'inline']

/** Kinds that get one group per composition depth in the declared cascade. Responsive and non-responsive variants share one group there, ordered by sort key. */
const depthKinds: readonly RuleKind[] = ['styled', 'onevar', 'resonevar', 'allvar']
const declaredGroupOfKind: Record<string, string> = { styled: 'styled', onevar: 'variants', resonevar: 'variants', allvar: 'compound' }
const declaredDepthGroups = ['styled', 'variants', 'compound']

/** Deepest composition level with its own groups; deeper composers share the last one. */
export const maxDepth = 7

/**
 * Declared cascade. Themes and globals first, then for each composition depth three groups
 * (base, variants, compound variants) so everything of a deeper composer beats everything of a
 * shallower one, then inline. Within a group, rules are inserted at a position given by a sort key
 * (declaration order, then breakpoint order within one variant) instead of being appended, so the
 * sheet does not depend on render order and media queries grant no priority of their own.
 */
export const declaredNames: readonly string[] = ['themed', 'global', ...Array.from({ length: maxDepth + 1 }, (_, depth) => declaredDepthGroups.map((group) => `${group}${depth}`)).flat(), 'inline']

/** Returns the name of the group a rule of the given kind and composition depth belongs to. */
export const getGroupName = (cascade: Cascade, kind: RuleKind, depth: number): string => (cascade === 'declared' && depthKinds.includes(kind) ? `${declaredGroupOfKind[kind]}${Math.min(depth, maxDepth)}` : kind)

const isSheetAccessible = (sheet: CSSStyleSheet): boolean => {
	if (sheet.href && !sheet.href.startsWith(location.origin)) {
		return false
	}

	try {
		return !!sheet.cssRules
	} catch {
		return false
	}
}

/** Serializes the hydration marker for a group: its cache, plus the rule sort keys in the declared cascade. */
const toMarker = (group: RuleGroup, cascade: Cascade): string => `--sxs{--sxs:${[...group.cache].join(' ')}${cascade === 'declared' && group.keys.length ? `;--sxsk:${group.keys.join(' ')}` : ''}}`

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
							return `${toMarker(groupSheet.rules[name], groupSheet.cascade)}${cssText}`
						}
					}

					return cssRule.cssRules?.length ? `${lastRuleCssText}${cssText}` : ''
				}

				return cssText
			})
			.join('')
	}
}

/** Parses a hydration marker's cache entries and, in the declared cascade, its rule sort keys. */
const parseMarker = (cssText: string, cascade: Cascade): { cache: string[]; keys: number[] } => {
	if (cascade === 'legacy') {
		// unchanged 1.x parsing of the browser serialization `--sxs { --sxs: ...; }`
		return { cache: cssText.slice(14, -3).trim().split(/\s+/), keys: [] }
	}

	const cacheMatch = /--sxs:\s*([^;}]*)/.exec(cssText)
	const keysMatch = /--sxsk:\s*([^;}]*)/.exec(cssText)

	return {
		cache: (cacheMatch ? cacheMatch[1] : '').trim().split(/\s+/),
		keys: keysMatch && keysMatch[1].trim() ? keysMatch[1].trim().split(/\s+/).map(Number) : [],
	}
}

export const createSheet = (root: (DocumentOrShadowRoot & Node) | null, cascade: Cascade): SheetGroup => {
	const names = cascade === 'declared' ? declaredNames : legacyNames

	// groupSheet is initialized by reset() before createSheet returns.
	// We create the object upfront with a placeholder sheet, then reset() fills it in properly.
	const groupSheet: SheetGroup = {
		sheet: null as never, // overwritten by reset() below before any external access
		cascade,
		names,
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

				const { cache, keys } = parseMarker(cssText, cascade)

				const groupName = names[Number(cache[0])]

				if (!groupName) continue

				const groupRule = group as unknown as GroupRule
				// A key per hydrated rule is required to position later rules; without them, later rules append.
				const hydratedKeys = keys.length === groupRule.cssRules.length ? keys : Array.from({ length: groupRule.cssRules.length }, () => Number.NEGATIVE_INFINITY)

				groupSheet.sheet = existingSheet
				groupSheet.rules[groupName] = { group: groupRule, index, cache: new Set(cache), keys: hydratedKeys, apply: noop }
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
				currentRules[name] = { group: currentSheet.cssRules[index + 1] as unknown as GroupRule, index, cache: new Set([i]), keys: [], apply: noop }
			}
			addApplyToGroup(currentRules[name], cascade)
		}
	}

	groupSheet.reset = reset

	reset()

	return groupSheet
}

const noop = () => undefined

/** Document nodes have nodeType 9; this avoids referencing the `Document` global, which does not exist outside browsers. */
const isDocument = (node: DocumentOrShadowRoot & Node): node is Document => node.nodeType === 9

const addApplyToGroup = (group: RuleGroup, cascade: Cascade): void => {
	const groupingRule = group.group

	if (cascade === 'legacy') {
		let index = groupingRule.cssRules.length

		group.apply = (cssText: string): void => {
			try {
				groupingRule.insertRule(cssText, index)
				++index
			} catch {
				// do nothing and continue
			}
		}

		return
	}

	// Declared cascade: insert after the last rule whose key is <= the new key, so equal keys keep
	// their insertion order and a rule declared earlier always precedes one declared later.
	const { keys } = group

	group.apply = (cssText: string, key = 0): void => {
		let low = 0
		let high = keys.length

		while (low < high) {
			const middle = (low + high) >>> 1
			if (keys[middle] > key) high = middle
			else low = middle + 1
		}

		try {
			groupingRule.insertRule(cssText, low)
			keys.splice(low, 0, key)
		} catch {
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
	let pending: [string, string, number | undefined][] = []

	const rules: Record<string, { apply: (rule: string, key?: number) => void }> = {}
	globalSheet.names.forEach((sheetName) => {
		rules[sheetName] = { apply: (rule: string, key?: number) => pending.push([sheetName, rule, key]) }
	})

	return Object.assign(
		function injector() {
			for (let i = 0; i < pending.length; i++) {
				const [sheet, cssString, key] = pending[i]
				globalSheet.rules[sheet].apply(cssString, key)
			}
			pending = []
			return null
		},
		{ rules },
	)
}
