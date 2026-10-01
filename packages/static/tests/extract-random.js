// Plain JS, like extract-css.js: the client hydrates from a fake CSSOM.
// Randomized: for each seed, random compositions are extracted, a client hydrates from the file,
// and random props within what the extractor covers are rendered. Nothing may be injected. A
// failure names its seed; `SEED=<n> yarn vitest run packages/static/tests/extract-random.js` reruns it.
import { createStitches } from '../../core/src/index.ts'
import { createRandom, generateComponent, generateProps, media } from '../../core/tests/helpers/random-styles.ts'
import { extractCss } from '../src/index.ts'
import { toHydratingRoot } from './helpers/fake-sheet.js'

const seeds = process.env.SEED ? [Number(process.env.SEED)] : [11, 12, 13, 14, 15]

/** The innermost `{declarations}` of a rule. */
const declarationOf = (rule) => rule.slice(rule.lastIndexOf('{'), rule.indexOf('}') + 1)

/** Class rules in `after` whose class `before` does not mention, with their condition wrappers. */
const newRules = (before, after) => {
	const rules = after.match(/(@media[^{]*\{)*\.[\w-]+[^{]*\{[^}]*\}/g) ?? []
	return rules.filter((rule) => !before.includes(/\.([\w-]+)/.exec(rule)[1]))
}

/** Builds each composition with the given css(). */
const build = (css, components) => components.map(({ chain }) => chain.slice(1).reduce((component, definition) => css(component, definition), css(chain[0])))

describe('extractCss on random compositions', () => {
	for (const mode of ['legacy', 'declared', 'atomic']) {
		const config = mode === 'atomic' ? { atomic: true, media } : { cascade: mode, media }

		for (const seed of seeds) {
			test(`${mode}, seed ${seed}: every covered render is already in the file`, () => {
				const random = createRandom(seed)
				const components = Array.from({ length: 25 }, () => generateComponent(random))

				const server = createStitches({ ...config, root: null })
				const extracted = extractCss(server, [build(server.css, components)])

				const client = createStitches({ ...config, root: toHydratingRoot(extracted) })
				const built = build(client.css, components)

				// the sheet as last checked, so each render is compared only with what it could have added
				let verified = extracted

				for (const [index, component] of components.entries()) {
					for (let round = 0; round < 10; round++) {
						// within coverage: per-breakpoint values all at one breakpoint, no css prop
						const props = generateProps(random, component, { css: false, singleBreakpoint: true })
						built[index](props)

						const cssText = client.getCssText()

						if (cssText === verified) continue

						const injected = newRules(verified, cssText)

						// Atomic output may still write one kind of rule at runtime: a longhand restated under an
						// earlier shorthand's breakpoint, which exists only for that combination. Its declaration
						// is always in the file already, under fewer conditions; anything else is a gap.
						const gaps = mode === 'atomic' ? injected.filter((rule) => !extracted.includes(declarationOf(rule))) : injected

						if (gaps.length) {
							throw new Error(`seed ${seed}: rendering ${JSON.stringify(props)} on ${JSON.stringify(component.chain)} injected ${gaps.join(' ')}`)
						}

						verified = cssText
					}
				}
			})
		}
	}
})
