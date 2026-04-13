import type { StitchesInit, StitchesInstance, CssArg, ComponentConfig } from '../../core/src/types.ts'
import { createStitches as createStitchesCore } from '../../core/src/createStitches.ts'
import type { StyledComponent } from './features/styled.ts'
import { createStyledFunction } from './features/styled.ts'

export type ReactStyledFunction = {
	(...args: CssArg[]): StyledComponent
	withConfig: (config?: ComponentConfig) => (...args: CssArg[]) => StyledComponent
}

export type ReactStitchesInstance = StitchesInstance & { styled: ReactStyledFunction }

export const createStitches = (init?: StitchesInit): ReactStitchesInstance => {
	const instance = createStitchesCore(init) as ReactStitchesInstance

	instance.styled = createStyledFunction(instance) as ReactStyledFunction

	return instance
}
