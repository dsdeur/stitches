import type { StitchesInit, StitchesInstance, StyledFunction } from '../../core/src/types.ts'
import { createStitches as createStitchesCore } from '../../core/src/createStitches.ts'
import { createStyledFunction } from './features/styled.ts'

export type ReactStitchesInstance = StitchesInstance & { styled: StyledFunction }

export const createStitches = (init?: StitchesInit): ReactStitchesInstance => {
	const instance = createStitchesCore(init) as ReactStitchesInstance

	instance.styled = createStyledFunction(instance)

	return instance
}
