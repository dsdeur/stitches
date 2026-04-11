import type { ReactStitchesInstance } from '../createStitches.ts'
import { createStitches } from '../createStitches.ts'

let cachedConfig: ReactStitchesInstance | undefined

export const getCachedConfig = (): ReactStitchesInstance => cachedConfig || (cachedConfig = createStitches())
