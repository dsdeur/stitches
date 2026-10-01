// The native package must not be reachable from the web packages, and must not drag anything
// into a native bundle either: the main entry imports nothing, and the react entry imports react
// and nothing else. Both directions are checked from the source, so this holds whether or not
// anything has been built.
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

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

	test('only the react entry imports anything outside the package, and that is react alone', () => {
		const source = join(packages, 'native', 'src')
		const reactEntry = join(source, 'react')
		const outside = []

		for (const path of sourceFiles(source)) {
			for (const { specifier, typeOnly } of imports(path)) {
				if (typeOnly) continue

				if (specifier.startsWith('.')) {
					// relative imports must stay inside the package's own source
					if (!join(dirname(path), specifier).startsWith(source)) outside.push(`${path}: ${specifier}`)
				} else if (!(specifier === 'react' && path.startsWith(reactEntry))) outside.push(`${path}: ${specifier}`)
			}
		}

		expect(outside).toEqual([])
	})

	test('the React-free entry never reaches the react entry, so it stays usable without React', () => {
		const source = join(packages, 'native', 'src')
		const reactEntry = join(source, 'react')
		const offenders = []

		for (const path of sourceFiles(source)) {
			if (path.startsWith(reactEntry)) continue

			for (const { specifier } of imports(path)) {
				if (join(dirname(path), specifier).startsWith(reactEntry)) offenders.push(`${path}: ${specifier}`)
			}
		}

		expect(offenders).toEqual([])
	})

	test('and declares react as its only dependency, an optional peer', () => {
		const manifest = JSON.parse(readFileSync(join(packages, 'native', 'package.json'), 'utf8'))

		expect(['dependencies', 'optionalDependencies'].filter((field) => field in manifest)).toEqual([])
		expect(Object.keys(manifest.peerDependencies)).toEqual(['react'])
		expect(manifest.peerDependenciesMeta).toEqual({ react: { optional: true } })
	})
})
