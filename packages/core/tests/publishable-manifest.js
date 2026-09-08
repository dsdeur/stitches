// Plain JS on purpose: exercises the packing script, which is plain JS in .task.
// Whether every export target exists in the staged output is publint's job (yarn lint:pkg, after
// yarn build); this test needs no build and covers the rewrite itself.
import { readFileSync } from 'fs'
import { toPublishableExports } from '../../../.task/pack.js'

const manifestOf = (name) => JSON.parse(readFileSync(new URL(`../../${name}/package.json`, import.meta.url), 'utf8'))

describe('Publishable manifest', () => {
	test('a source entry is rewritten to its built file, everything else is left alone', () => {
		expect(toPublishableExports('./src/index.ts')).toBe('./dist/index.mjs')
		expect(toPublishableExports('./dist/index.cjs')).toBe('./dist/index.cjs')
		expect(toPublishableExports({ '.': { types: './types/index.d.ts', import: './src/index.ts' } })).toEqual({ '.': { types: './types/index.d.ts', import: './dist/index.mjs' } })
	})

	for (const name of ['core', 'react', 'stringify']) {
		test(`@stitches/${name}: the published exports point at built files only`, () => {
			const published = toPublishableExports(manifestOf(name).exports)

			expect(JSON.stringify(published).includes('./src/')).toBe(false)
			expect(published['.'].types).toBe('./types/index.d.ts')
			expect(published['.'].import).toBe('./dist/index.mjs')
			expect(published['.'].require).toBe('./dist/index.cjs')
		})
	}

	test('the react checkout manifest is the only one that points an export at source', () => {
		// documented in AGENTS.md: a submodule checkout is consumable without a build
		expect(manifestOf('react').exports['.'].import).toBe('./src/index.ts')
		expect(manifestOf('core').exports['.'].import).toBe('./dist/index.mjs')
		expect(manifestOf('stringify').exports['.'].import).toBe('./dist/index.mjs')
	})
})
