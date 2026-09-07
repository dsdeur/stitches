import type { SheetGroup } from '../types.ts'

/**
 * Memoizes one value per sheet.
 *
 * The feature functions (css, globalCss, keyframes, createTheme, styled) close over the sheet they
 * write to, so they must not be shared between instances. Keying them on the config alone did
 * exactly that: two instances with an equal config but different roots were handed the first
 * instance's function, and every style went into the first instance's sheet. A sheet belongs to
 * one instance and the config is fixed for that instance, so the sheet is the correct key.
 */
export const createSheetMemo = <R>() => {
	const cache = new WeakMap<SheetGroup, R>()

	return (sheet: SheetGroup, apply: () => R): R => {
		const existing = cache.get(sheet)

		if (existing !== undefined) return existing

		const result = apply()

		cache.set(sheet, result)

		return result
	}
}
