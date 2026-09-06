import type { Cascade } from '../types.ts'

/**
 * The cascade used when createStitches() is called without one. Kept in its own module so the
 * test suite can be run a second time with 'declared' forced on (see vitest.declared.config.ts).
 */
export const defaultCascade: Cascade = 'legacy'
