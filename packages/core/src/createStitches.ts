import type { StitchesInit, StitchesConfig, StitchesInstance } from './types.ts'
import { defaultThemeMap } from './default/defaultThemeMap.ts'

import { createMemo } from './utility/createMemo.ts'

import { createCssFunction } from './features/css.ts'
import { createGlobalCssFunction } from './features/globalCss.ts'
import { createKeyframesFunction } from './features/keyframes.ts'
import { createCreateThemeFunction } from './features/createTheme.ts'

import { createSheet } from './sheet.ts'

const createCssMap = createMemo()

export const createStitches = (init?: StitchesInit): StitchesInstance => {
	let didRun = false

	const instance = createCssMap(init, (rawInit): StitchesInstance => {
		didRun = true

		const initConfig: StitchesInit = (typeof rawInit === 'object' && rawInit) || {}

		const prefix = initConfig.prefix ?? ''
		const media = initConfig.media ?? {}
		const root = 'root' in initConfig ? (initConfig.root ?? null) : (globalThis.document ?? null)
		const theme = initConfig.theme ?? {}
		const themeMap = initConfig.themeMap ?? { ...defaultThemeMap }
		const utils = initConfig.utils ?? {}

		const config: StitchesConfig = { prefix, media, theme, themeMap, utils }

		const sheet = createSheet(root)

		const returnValue: StitchesInstance = {
			css: createCssFunction(config, sheet),
			globalCss: createGlobalCssFunction(config, sheet),
			keyframes: createKeyframesFunction(config, sheet),
			createTheme: createCreateThemeFunction(config, sheet),
			reset() {
				sheet.reset()
				returnValue.theme.toString()
			},
			theme: { className: '', selector: '', toString: () => '' },
			sheet,
			config,
			prefix,
			getCssText: sheet.toString,
			toString: sheet.toString,
		}

		// initialize default theme
		String((returnValue.theme = returnValue.createTheme(theme)))

		return returnValue
	})

	if (!didRun) instance.reset()

	return instance
}
