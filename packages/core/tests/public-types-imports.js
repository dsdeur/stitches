// Plain JS on purpose: reads the published .d.ts files off disk, no DOM or stitches types needed.
import { readFileSync, readdirSync } from 'fs'

const packages = ['core', 'react', 'stringify']

const readTypeFiles = (name) => {
	const directory = new URL(`../../${name}/types/`, import.meta.url)

	return readdirSync(directory)
		.filter((file) => file.endsWith('.d.ts'))
		.map((file) => ({ file: `packages/${name}/types/${file}`, source: readFileSync(new URL(file, directory), 'utf8') }))
}

describe('Published type declarations', () => {
	test('every relative import carries an explicit file extension', () => {
		// Without it, a consumer on moduleResolution nodenext fails with TS2834, and the unresolved
		// namespace cascades into unrelated errors elsewhere in the same file (upstream #833, #1160).
		const offenders = []

		for (const name of packages) {
			for (const { file, source } of readTypeFiles(name)) {
				for (const match of source.matchAll(/from\s+'(\.[^']*)'/g)) {
					if (!/\.(js|cjs|mjs|json)$/.test(match[1])) offenders.push(`${file}: ${match[1]}`)
				}
			}
		}

		expect(offenders).toEqual([])
	})

	test('no relative import points at a .ts file, which consumers cannot resolve', () => {
		const offenders = []

		for (const name of packages) {
			for (const { file, source } of readTypeFiles(name)) {
				for (const match of source.matchAll(/from\s+'(\.[^']*\.ts)'/g)) offenders.push(`${file}: ${match[1]}`)
			}
		}

		expect(offenders).toEqual([])
	})
})
