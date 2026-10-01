// Publishes every public workspace package to GitHub Packages from its staged, publishable form
// (see pack.js). Run by .github/workflows/release.yml when a `v<version>` tag is pushed, after the
// full check set; it is not meant to be run by hand, though `--dry-run` is safe anywhere.
//
//   node .task/publish.js v1.4.0 [--dry-run]
//
// The tag must equal every package's version, so a tag can never publish something other than
// what the manifests in that commit say. A prerelease version goes out under the `next` dist-tag,
// so it never becomes what a plain install resolves to.
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pack, registry } from './pack.js'

const root = new URL('../', import.meta.url).pathname

/** The public workspace packages, in workspace order. */
export const publicPackages = () =>
	JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
		.workspaces.map((workspace) => ({ dir: join(root, workspace), manifest: JSON.parse(readFileSync(join(root, workspace, 'package.json'), 'utf8')) }))
		.filter(({ manifest }) => !manifest.private)

/** Every package whose version is not the tag's, as `name@version`. Empty when the tag may publish. */
export const versionMismatches = (tag, packages) => packages.filter(({ manifest }) => `v${manifest.version}` !== tag).map(({ manifest }) => `${manifest.name}@${manifest.version}`)

export const distTag = (version) => (version.includes('-') ? 'next' : 'latest')

if (process.argv[1] === new URL(import.meta.url).pathname) {
	const [tag, ...flags] = process.argv.slice(2)
	const dryRun = flags.includes('--dry-run')

	if (!tag || !tag.startsWith('v')) {
		console.error('usage: node .task/publish.js v<version> [--dry-run]')
		process.exit(2)
	}

	const packages = publicPackages()
	const mismatches = versionMismatches(tag, packages)

	if (mismatches.length) {
		console.error(`tag ${tag} does not match: ${mismatches.join(', ')}`)
		process.exit(1)
	}

	for (const { dir, manifest } of packages) {
		const staged = join(mkdtempSync(join(tmpdir(), 'stitches-release-')), 'package')
		const published = pack(dir, staged)
		const args = ['publish', staged, '--registry', registry, '--tag', distTag(manifest.version), ...(dryRun ? ['--dry-run'] : [])]

		console.log(`${dryRun ? '[dry run] ' : ''}${published.name}@${published.version} -> ${registry} (${distTag(manifest.version)})`)

		const result = spawnSync('npm', args, { stdio: 'inherit' })

		if (result.status !== 0) process.exit(result.status ?? 1)
	}
}
