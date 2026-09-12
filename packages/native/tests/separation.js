// The native package must not be reachable from the web packages, and must not drag anything
// into a native bundle either. Both directions are checked from the source, so this holds
// whether or not anything has been built.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const packages = new URL('../../', import.meta.url).pathname

const sourceFiles = (dir) =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name)

		if (entry.isDirectory()) return sourceFiles(path)

		return /\.tsx?$/.test(entry.name) ? [path] : []
	})

// One import or export statement. The clause may span lines (core writes long type imports that
// way), so the only thing stopping the match from running into the next statement is that it may
// not cross another import or export keyword.
const statement = /\b(import|export)\s+(type\s+)?(?:(?!\b(?:import|export)\b)[^'"])*?from\s*['"]([^'"]+)['"]/g

/** Every `from '...'` in a file, with the ones written `import type` marked, since those vanish at build. */
const imports = (path) => {
	const source = readFileSync(path, 'utf8')

	return Array.from(source.matchAll(statement), (match) => ({ specifier: match[3], typeOnly: Boolean(match[2]) }))
}

describe('the native package stays out of the web packages', () => {
	test('no web package imports it', () => {
		const offenders = []

		for (const name of ['core', 'react', 'stringify']) {
			for (const path of sourceFiles(join(packages, name, 'src'))) {
				for (const { specifier } of imports(path)) {
					if (specifier.includes('native')) offenders.push(`${path}: ${specifier}`)
				}
			}
		}

		expect(offenders).toEqual([])
	})

	test('it has no runtime import of its own, so a native bundle gets only this code', () => {
		const runtime = []

		for (const path of sourceFiles(join(packages, 'native', 'src'))) {
			for (const { specifier, typeOnly } of imports(path)) {
				if (!typeOnly && !specifier.startsWith('./')) runtime.push(`${path}: ${specifier}`)
			}
		}

		expect(runtime).toEqual([])
	})

	test('and declares no dependencies', () => {
		const manifest = JSON.parse(readFileSync(join(packages, 'native', 'package.json'), 'utf8'))

		const declared = ['dependencies', 'peerDependencies', 'optionalDependencies'].filter((field) => field in manifest)

		expect(declared).toEqual([])
	})
})
