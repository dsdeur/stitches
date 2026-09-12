// Variant props are the part of the API worth typing: a typo in a variant value should be an
// error, not a style that silently does nothing.
import { createStitches } from '../src/index.ts'

const { css, createTheme } = createStitches({ theme: { space: { 1: '4px' } } })

const button = css({
	padding: '$1',
	variants: {
		size: { small: { padding: '$1' }, large: { padding: '$1' } },
		disabled: { true: { opacity: 0.5 }, false: { opacity: 1 } },
	},
})

button({ size: 'large' })
button({ size: 'small', disabled: true })
button()
button({ css: { padding: 2 } })

// @ts-expect-error a value the variant does not define
button({ size: 'larg' })

// @ts-expect-error a variant the definition does not declare
button({ tone: 'brand' })

// @ts-expect-error a boolean variant takes a boolean, not the key as a string
button({ disabled: 'true' })

const extended = css(button, { variants: { tone: { brand: { padding: '$1' } } } })

// Composition keeps both sets of variants.
extended({ size: 'large', tone: 'brand' })

// @ts-expect-error still checked after composition
extended({ tone: 'quiet' })

// A theme is passed as the second argument, not guessed at.
button({ size: 'large' }, createTheme({ space: { 1: '8px' } }))
