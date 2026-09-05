import { createStitches, defaultThemeMap } from '../../packages/core/src/index.ts'
const { css, getCssText, theme } = createStitches({
	theme: {
		colors: { gray: '#888', blue: 'dodgerblue' },
		borderWidths: { thin: '1px' },
		borders: { subtle: '$borderWidths$thin solid $colors$gray', focus: '2px solid $colors$blue' },
	},
	themeMap: { ...defaultThemeMap, border: 'borders', borderTop: 'borders', outline: 'borders' },
})
const Box = css({ border: '$subtle', '&:focus': { outline: '$focus' } })
Box()
console.log(getCssText().replace(/--sxs\{--sxs:[^}]*\}/g, '').replace(/@media\{\}/g, ''))
console.log('theme.borders.subtle ->', String(theme.borders.subtle), '| value:', theme.borders.subtle.value)
