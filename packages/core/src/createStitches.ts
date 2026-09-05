import type { StitchesInit, StitchesConfig, StitchesInstance } from './types.ts'
import { defaultThemeMap } from './default/defaultThemeMap.ts'

import { createMemo } from './utility/createMemo.ts'

import { createCssFunction } from './features/css.ts'
import { createGlobalCssFunction } from './features/globalCss.ts'
import { createKeyframesFunction } from './features/keyframes.ts'
import { createCreateThemeFunction } from './features/createTheme.ts'

import { createSheet } from './sheet.ts'

type SheetRoot = NonNullable<StitchesInit['root']>

const createInstancesMap = createMemo()

export const createStitches = (init?: StitchesInit): StitchesInstance => {
	const initConfig: StitchesInit = (typeof init === 'object' && init) || {}

	// `root` is a DOM node, so it is cyclic and cannot be part of the serialized memo key.
	// Instances are memoized on the rest of the config, then on the identity of the root.
	// An absent or undefined root means the document (as in 1.2.x); null means no DOM at all.
	const { root: initRoot, ...memoInit } = initConfig
	const root: SheetRoot | null = initRoot === undefined ? (globalThis.document ?? null) : initRoot

	const instancesByRoot = createInstancesMap(memoInit, (): Map<SheetRoot | null, StitchesInstance> => new Map())

	const existing = instancesByRoot.get(root)

	if (existing) {
		existing.reset()

		return existing
	}

	const instance = createInstance(memoInit, root)

	instancesByRoot.set(root, instance)

	return instance
}

const createInstance = (initConfig: Omit<StitchesInit, 'root'>, root: SheetRoot | null): StitchesInstance => {
	const prefix = initConfig.prefix ?? ''
	const media = initConfig.media ?? {}
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
}
