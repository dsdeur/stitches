// Plain JS on purpose: the tests tsconfig has no Node types, and this test only needs fs.
import { readFileSync } from 'fs'

const readPackage = (name) => JSON.parse(readFileSync(new URL(`../../${name}/package.json`, import.meta.url), 'utf8'))

describe('Package exports', () => {
	for (const name of ['core', 'react', 'stringify']) {
		test(`@stitches/${name} lists the types condition first (conditions are matched in order)`, () => {
			const root = readPackage(name).exports['.']

			expect(typeof root).toBe('object')
			expect(Object.keys(root)[0]).toBe('types')
		})

		test(`@stitches/${name} exposes ./types/* so declaration emit can reference internal type files`, () => {
			const typesEntry = readPackage(name).exports['./types/*']

			expect(typeof typesEntry).toBe('object')
			expect(Object(typesEntry).types).toBe('./types/*.d.ts')
		})
	}
})
