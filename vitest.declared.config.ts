import { fileURLToPath } from 'node:url'
import { defineConfig, mergeConfig } from 'vitest/config'
import base from './vitest.config.ts'

/**
 * Second run of the same suite with cascade 'declared' forced on. Which tests may differ, and
 * why, is declared in packages/core/tests/declared-run/allowlist.json; .task/test-declared.js
 * fails the run on any other difference.
 */
export default mergeConfig(
	base,
	defineConfig({
		resolve: {
			alias: [
				{
					find: /^.*\/defaultCascade\.ts$/,
					replacement: fileURLToPath(new URL('./packages/core/tests/declared-run/defaultCascade.ts', import.meta.url)),
				},
			],
		},
		test: {
			setupFiles: ['./packages/core/tests/declared-run/normalize.ts'],
		},
	}),
)
