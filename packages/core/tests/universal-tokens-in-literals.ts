import { createStitches } from '../src/index.ts'

describe('Tokens inside url() and string literals', () => {
	test('token syntax inside url() and quoted strings is left alone, tokens outside them still resolve', () => {
		const { css, toString } = createStitches({ theme: { colors: { red: 'tomato' } } })

		css({
			backgroundImage: 'url(/img/logo$dark.png)',
			background: 'url("https://deploy-preview-2--site.netlify.app/a.png") $red',
			content: '"price: $5"',
			borderColor: "'$red' $red",
			maskImage: 'url(a--b.svg), url("c$d.svg")',
		})()

		const cssText = toString()

		for (const declaration of [
			'background-image:url(/img/logo$dark.png)',
			'background:url("https://deploy-preview-2--site.netlify.app/a.png") var(--colors-red)',
			'content:"price: $5"',
			"border-color:'$red' var(--colors-red)",
			'mask-image:url(a--b.svg), url("c$d.svg")',
		]) {
			expect(cssText.includes(declaration)).toBe(true)
		}
	})
})
