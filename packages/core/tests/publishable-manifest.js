// Plain JS on purpose: exercises the packing script, which is plain JS in .task.
import { existsSync, mkdtempSync, readdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { pack, toPublishableExports } from '../../../.task/pack.js'

const root = new URL('../../../', import.meta.url).pathname

/** Every string target in an exports map. */
const targets = (field, out = []) => {
	if (typeof field === 'string') out.push(field)
	else if (field && typeof field === 'object') for (const key of Object.keys(field)) targets(field[key], out)
	return out
}

describe('Publishable manifest', () => {
	test('a source entry is rewritten to its built file, everything else is left alone', () => {
		expect(toPublishableExports('./src/index.ts')).toBe('./dist/index.mjs')
		expect(toPublishableExports('./dist/index.cjs')).toBe('./dist/index.cjs')
		expect(toPublishableExports({ '.': { types: './types/index.d.ts', import: './src/index.ts' } })).toEqual({ '.': { types: './types/index.d.ts', import: './dist/index.mjs' } })
	})

	for (const name of ['core', 'react', 'stringify']) {
		test(`@stitches/${name}: the staged package has no source exports and every export target exists`, () => {
			const staged = join(mkdtempSync(join(tmpdir(), `stitches-test-${name}-`)), name)
			const manifest = pack(join(root, 'packages', name), staged)

			expect(JSON.stringify(manifest.exports).includes('./src/')).toBe(false)
			expect(manifest.exports['.'].import).toBe('./dist/index.mjs')

			for (const target of targets(manifest.exports)) {
				if (target.includes('*')) {
					// a pattern like ./types/*.d.ts: the directory must hold at least one matching file
					const [directory, suffix] = [target.slice(2, target.indexOf('*')), target.slice(target.indexOf('*') + 1)]
					expect(readdirSync(join(staged, directory)).some((file) => file.endsWith(suffix))).toBe(true)
				} else {
					expect(existsSync(join(staged, target))).toBe(true)
				}
			}
		})
	}
})
