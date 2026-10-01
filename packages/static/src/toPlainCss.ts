/**
 * The sheet as plain css: without the `--sxs{…}` hydration markers and without the unconditional
 * `@media{…}` blocks the runtime groups rules in. The rules and their order are unchanged, so the
 * cascade is the same; what is gone is only the bookkeeping a runtime needs to hydrate, which a
 * page without the runtime has no use for.
 */
/** The index of the quote that closes the string opening at `start`, skipping escaped characters. */
const closingQuote = (cssText: string, start: number): number => {
	const quote = cssText[start]
	let index = start + 1

	while (index < cssText.length && cssText[index] !== quote) index += cssText[index] === '\\' ? 2 : 1

	return index
}

export const toPlainCss = (cssText: string): string => {
	let plain = ''
	let index = 0

	while (index < cssText.length) {
		if (cssText.startsWith('--sxs{', index)) {
			index = cssText.indexOf('}', index) + 1
			continue
		}

		if (cssText.startsWith('@media{', index)) {
			// find the brace that closes this group, then keep what is inside it
			let depth = 0
			let end = index + '@media'.length

			for (; end < cssText.length; end++) {
				const character = cssText[end]

				// a brace inside a quoted value, `content: "{"`, is text, not structure
				if (character === '"' || character === "'") end = closingQuote(cssText, end)
				else if (character === '{') depth++
				else if (character === '}' && --depth === 0) break
			}

			plain += cssText.slice(index + '@media{'.length, end)
			index = end + 1
			continue
		}

		plain += cssText[index++]
	}

	return plain
}
