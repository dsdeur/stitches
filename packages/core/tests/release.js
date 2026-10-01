// Plain JS on purpose: exercises the release scripts, which are plain JS in .task. Nothing here
// publishes; the functions under test only compute names, versions and tags.
import { toPublishableManifest, registry } from '../../../.task/pack.js'
import { distTag, publicPackages, versionMismatches } from '../../../.task/publish.js'

describe('Release', () => {
	test('the published manifest carries the fork name, repository and registry', () => {
		const published = toPublishableManifest({ name: '@stitches/core', version: '1.4.0', publishConfig: { access: 'public' }, exports: { '.': { import: './src/index.ts' } } })

		expect(published.name).toBe('@dsdeur/stitches-core')
		expect(published.repository).toEqual({ type: 'git', url: 'git+https://github.com/dsdeur/stitches.git' })
		expect(published.publishConfig).toEqual({ access: 'public', registry })
		expect(registry).toBe('https://npm.pkg.github.com')
		expect(published.exports).toEqual({ '.': { import: './dist/index.mjs' } })
	})

	test('every public workspace package is published, and the private type fixture is not', () => {
		const names = publicPackages().map(({ manifest }) => manifest.name)

		expect(names.includes('@stitches/core')).toBe(true)
		expect(names.includes('@stitches/react')).toBe(true)
		expect(names.includes('@stitches/test')).toBe(false)
	})

	test('a tag publishes only when it equals every package version', () => {
		const packages = [{ manifest: { name: '@stitches/core', version: '1.4.0' } }, { manifest: { name: '@stitches/react', version: '1.3.9' } }]

		expect(versionMismatches('v1.4.0', packages)).toEqual(['@stitches/react@1.3.9'])
		expect(versionMismatches('v1.4.0', packages.slice(0, 1))).toEqual([])
	})

	test('a prerelease goes out under next, never latest', () => {
		expect(distTag('2.0.0-next.1')).toBe('next')
		expect(distTag('2.0.0')).toBe('latest')
	})
})
