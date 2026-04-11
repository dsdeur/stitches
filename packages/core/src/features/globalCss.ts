import type { StitchesConfig, SheetGroup, CSSObject, GlobalCssFunction } from '../types.ts'
import { createMemo } from '../utility/createMemo.ts'
import { define } from '../utility/define.ts'

import { toCssRules } from '../convert/toCssRules.ts'
import { toHash } from '../convert/toHash.ts'

const createGlobalCssFunctionMap = createMemo()

/** Returns a function that applies global styles. */
export const createGlobalCssFunction = (config: StitchesConfig, sheet: SheetGroup): GlobalCssFunction =>
	createGlobalCssFunctionMap(
		config,
		(): GlobalCssFunction =>
			(...styles: CSSObject[]) => {
				const render = () => {
					for (let style of styles) {
						style = (typeof style === 'object' && style) || {}

						let uuid = toHash(style)

						if (!sheet.rules.global.cache.has(uuid)) {
							sheet.rules.global.cache.add(uuid)

							// support @import rules
							if ('@import' in style) {
								let importIndex = Array.from({ length: sheet.sheet.cssRules.length }, (_, i) => sheet.sheet.cssRules[i]).indexOf(sheet.rules.themed.group as never) - 1

								// wrap import in quotes as a convenience
								for (let importValue of ([] as string[]).concat(style['@import'] as string | string[])) {
									importValue = importValue.includes('"') || importValue.includes("'") ? importValue : `"${importValue}"`

									sheet.sheet.insertRule(`@import ${importValue};`, importIndex++)
								}

								delete style['@import']
							}

							toCssRules(style, [], [], config, (cssText) => {
								sheet.rules.global.apply(cssText)
							})
						}
					}

					return ''
				}

				return define(render, {
					toString: render,
				})
			},
	)
