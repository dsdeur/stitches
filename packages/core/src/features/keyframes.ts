import type { StitchesConfig, SheetGroup, CSSObject, KeyframesFunction } from '../types.ts'
import { createMemo } from '../utility/createMemo.ts'
import { define } from '../utility/define.ts'

import { toCssRules } from '../convert/toCssRules.ts'
import { toHash } from '../convert/toHash.ts'
import { toTailDashed } from '../convert/toTailDashed.ts'

const createKeyframesFunctionMap = createMemo()

/** Returns a function that applies a keyframes rule. */
export const createKeyframesFunction = (config: StitchesConfig, sheet: SheetGroup): KeyframesFunction =>
	createKeyframesFunctionMap(
		config,
		(): KeyframesFunction => (style: CSSObject) => {
			const name = `${toTailDashed(config.prefix)}k-${toHash(style)}`

			const render = () => {
				if (!sheet.rules.global.cache.has(name)) {
					sheet.rules.global.cache.add(name)

					const cssRules: string[] = []

					toCssRules(style, [], [], config, (cssText) => cssRules.push(cssText))

					const cssText = `@keyframes ${name}{${cssRules.join('')}}`

					sheet.rules.global.apply(cssText)
				}

				return name
			}

			return define(render, {
				get name() {
					return render()
				},
				toString: render,
			})
		},
	)
