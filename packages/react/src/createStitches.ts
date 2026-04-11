import type { StitchesInit, StitchesInstance } from '../../core/src/types.ts'
import { createStitches as createStitchesCore } from '../../core/src/createStitches.ts'
import { createStyledFunction } from './features/styled.ts'

export const createStitches = (init?: StitchesInit): StitchesInstance => {
	const instance = createStitchesCore(init)

	instance.styled = createStyledFunction(instance)

	return instance
}
