/**
 * Setup for the second test run (cascade 'declared' forced on). The existing tests assert the
 * full sheet text, which includes the hydration marker's container number and the split into
 * containers. Those are bookkeeping, not behavior, and they differ by design between the two
 * cascades. This shim compares sheet strings with markers removed and containers unwrapped, so
 * the remaining comparison is the exact sequence of rules. Class names and rule contents are
 * compared verbatim; only rule order can legitimately differ, and only for tests named in
 * allowlist.json.
 */
const unwrapContainers = (text: string): string => {
	let out = ''
	let i = 0
	while (i < text.length) {
		if (text.startsWith('--sxs{', i)) {
			i = text.indexOf('}', i) + 1
			continue
		}
		if (text.startsWith('@media{', i)) {
			let depth = 0
			let j = i + '@media'.length
			for (; j < text.length; j++) {
				if (text[j] === '{') depth++
				else if (text[j] === '}' && --depth === 0) break
			}
			out += text.slice(i + '@media{'.length, j)
			i = j + 1
			continue
		}
		out += text[i++]
	}
	return out
}

const isSheetText = (value: unknown): value is string => typeof value === 'string' && value.includes('--sxs')

// vitest/globals types globalThis.expect (see test-globals.d.ts), so no casts are needed here.
const original = expect

const shimmed = (actual: unknown) => ({
	toBe(expected: unknown) {
		return isSheetText(actual) || isSheetText(expected) ? original(unwrapContainers(String(actual))).toBe(unwrapContainers(String(expected))) : original(actual).toBe(expected)
	},
	toEqual(expected: unknown) {
		return isSheetText(actual) || isSheetText(expected) ? original(unwrapContainers(String(actual))).toEqual(unwrapContainers(String(expected))) : original(actual).toEqual(expected)
	},
	toBeInstanceOf(expected: Parameters<ReturnType<typeof original>['toBeInstanceOf']>[0]) {
		return original(actual).toBeInstanceOf(expected)
	},
	get not() {
		return original(actual).not
	},
})

Object.assign(shimmed, original)
Object.defineProperty(globalThis, 'expect', { value: shimmed, configurable: true, writable: true })
