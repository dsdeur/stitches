import type { StitchesInstance } from '../../../core/src/types.ts'
import { createStitches } from '../createStitches.ts'

let cachedConfig: StitchesInstance | undefined

export const getCachedConfig = (): StitchesInstance => cachedConfig || (cachedConfig = createStitches())
