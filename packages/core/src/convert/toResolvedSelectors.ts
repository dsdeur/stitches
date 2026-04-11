/** Returns selectors resolved from parent selectors and nested selectors. */
export const toResolvedSelectors = (parentSelectors: string[], nestedSelectors: string[]): string[] =>
	parentSelectors.length
		? parentSelectors.reduce((resolvedSelectors: string[], parentSelector) => {
				resolvedSelectors.push(
					...nestedSelectors.map((selector) => (selector.includes('&') ? selector.replace(/&/g, /[ +>|~]/.test(parentSelector) && /&.*&/.test(selector) ? `:is(${parentSelector})` : parentSelector) : parentSelector + ' ' + selector)),
				)

				return resolvedSelectors
			}, [])
		: nestedSelectors
