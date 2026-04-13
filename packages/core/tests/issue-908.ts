import { createStitches } from '../src/index.ts'

const styleRule = `--sxs { --sxs:1 lTyTw fJmROo; }`
const mediaRule = `@media { body { margin: auto; }`

const createStylesheet = (...preloadedStyles: string[]) => {
	const rules: { type: number; cssText: string; cssRules?: never[] }[] = []
	const insertRule = (rule: string, index = rules.length) => {
		if (rule.startsWith('--sxs')) {
			rules.splice(index, 0, { type: 1, cssText: rule })
		}
		if (rule.startsWith('@media')) {
			rules.splice(index, 0, { type: 4, cssText: rule, cssRules: [] })
		}
	}
	preloadedStyles.forEach(insertRule)
	return {
		insertRule,
		cssRules: rules,
	}
}

describe('Issue #908', () => {
	test('Getting hydratable stylesheet', () => {
		const { getCssText } = createStitches({
			root: {
				styleSheets: [createStylesheet(styleRule, mediaRule)],
			} as never,
		})

		expect(getCssText()).toBe(mediaRule)
	})
})
