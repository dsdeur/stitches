import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		// The previous runner picked up .ts and .js files under packages/*/tests. Type-only tests
		// (*.type-test.ts and the .tsx files) are checked by `yarn typecheck`, not executed.
		include: ['packages/*/tests/**/*.{ts,js}'],
		// tests/helpers holds shared test code, not tests.
		exclude: ['**/*.type-test.ts', '**/*.d.ts', '**/node_modules/**', '**/declared-run/**', '**/tests/helpers/**'],
	},
})
