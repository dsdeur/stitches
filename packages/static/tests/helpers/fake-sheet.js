// Plain JS on purpose: a fake CSSOM built from extracted text cannot satisfy the DOM types.
// Shared by the static tests; tests/helpers is excluded from test collection.

/** Splits `a{..}b{..}` into top-level rule strings, respecting nested braces. */
const splitRules = (text) => {
	const out = []
	let depth = 0
	let start = 0
	for (let i = 0; i < text.length; i++) {
		if (text[i] === '{') depth++
		else if (text[i] === '}' && --depth === 0) {
			out.push(text.slice(start, i + 1))
			start = i + 1
		}
	}
	return out
}

/**
 * A browser hands the marker back re-serialized, `--sxs { --sxs: 2 c-x; }`, and the legacy parser
 * reads exactly that form, so the fake sheet must too.
 */
const toBrowserMarker = (rule) => {
	const declarations = rule.slice('--sxs{'.length, -1).split(';')
	return `--sxs { ${declarations.map((declaration) => `${declaration.slice(0, declaration.indexOf(':'))}: ${declaration.slice(declaration.indexOf(':') + 1)};`).join(' ')} }`
}

/** One parsed rule: a marker, a grouping rule with its own children, or a plain rule. */
const toRule = (text) => {
	if (text.startsWith('--sxs{')) return { type: 1, cssText: toBrowserMarker(text) }
	if (!text.startsWith('@media{')) return { type: 1, cssText: text }

	const inner = splitRules(text.slice('@media{'.length, -1)).map((child) => ({ type: 1, cssText: child }))
	return {
		type: 4,
		cssRules: inner,
		insertRule(child, index) {
			inner.splice(index, 0, { type: 1, cssText: child })
		},
		get cssText() {
			return `@media{${inner.map((rule) => rule.cssText).join('')}}`
		},
	}
}

/**
 * A root whose only stylesheet is the extracted file, as the browser would parse it from a <link>.
 * Hydration inserts the groups the file left out (empty ones are not written), so the sheet takes
 * inserts the way a real one does.
 */
export const toHydratingRoot = (cssText) => {
	const cssRules = splitRules(cssText).map(toRule)
	const sheet = {
		cssRules,
		insertRule(text, index) {
			cssRules.splice(index, 0, toRule(text))
		},
		deleteRule(index) {
			cssRules.splice(index, 1)
		},
	}
	return { nodeType: 11, styleSheets: [sheet], ownerDocument: null, appendChild: (el) => el }
}
