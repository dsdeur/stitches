import type { StitchesConfig, SheetGroup, CSSObject, GlobalCssFunction } from '../types.ts'
import { createSheetMemo } from '../utility/createSheetMemo.ts'
import { define } from '../utility/define.ts'

import { toCssRules } from '../convert/toCssRules.ts'
import { toHash } from '../convert/toHash.ts'

const globalCssFunctionMemo = createSheetMemo<GlobalCssFunction>()

/** Returns a function that applies global styles. */
export const createGlobalCssFunction = (config: StitchesConfig, sheet: SheetGroup): GlobalCssFunction =>
	globalCssFunctionMemo(
		sheet,
		(): GlobalCssFunction =>
			(...styles: CSSObject[]) => {
				const render = () => {
					for (let style of styles) {
						style = (typeof style === 'object' && style) || {}

						const uuid = toHash(style)

						if (!sheet.rules.global.cache.has(uuid)) {
							sheet.rules.global.cache.add(uuid)

							// support @import rules
							if ('@import' in style) {
								let importIndex = Array.from({ length: sheet.sheet.cssRules.length }, (_, i) => sheet.sheet.cssRules[i]).indexOf(sheet.rules.themed.group as never) - 1

								// wrap import in quotes as a convenience
								for (let importValue of ([] as string[]).concat(style['@import'] as string | string[])) {
									importValue = importValue.includes('"') || importValue.includes("'") || importValue.startsWith('url(') ? importValue : `"${importValue}"`

									const importText = `@import ${importValue};`

									sheet.sheet.insertRule(importText, importIndex++)
									// getCssText() serializes from the recorded text, and imports precede every group there
									sheet.imports.push(importText)
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
