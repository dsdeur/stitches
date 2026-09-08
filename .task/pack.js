// Stages the publishable form of a workspace package into a directory: dist, types, README and
// LICENSE, plus a package.json whose exports point at built files.
//
// A checkout may point an export at ./src so a submodule consumer needs no build (PR #23 does this
// for react, which hudoman-mono vendors). A published tarball cannot: react's src reaches core by
// relative ../../core/src imports that do not exist in a standalone package. So the checkout and
// the published artifact have different manifests, and this is where the published one is made.
// yarn lint:pkg lints this output; the release workflow publishes it.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** Rewrites every export target under ./src/<name>.ts to its built counterpart ./dist/<name>.mjs. */
export const toPublishableExports = (field) => {
	if (typeof field === 'string') return field.replace(/^\.\/src\/(.+)\.ts$/, './dist/$1.mjs')

	if (field && typeof field === 'object') {
		const rewritten = {}
		for (const key of Object.keys(field)) rewritten[key] = toPublishableExports(field[key])
		return rewritten
	}

	return field
}

/** Copies the publishable files of `packageDir` into `outDir` and returns the manifest written there. */
export const pack = (packageDir, outDir) => {
	const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'))

	if (!existsSync(join(packageDir, 'dist'))) throw new Error(`${packageDir}/dist is missing; run yarn build first`)

	rmSync(outDir, { recursive: true, force: true })
	mkdirSync(outDir, { recursive: true })

	for (const entry of ['dist', 'types', 'README.md', 'LICENSE.md', 'LICENSE']) {
		const source = join(packageDir, entry)
		if (existsSync(source)) cpSync(source, join(outDir, entry), { recursive: true })
	}

	const publishable = { ...manifest, exports: toPublishableExports(manifest.exports) }
	writeFileSync(join(outDir, 'package.json'), `${JSON.stringify(publishable, null, 2)}\n`)

	return publishable
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
	const [packageDir, outDir] = process.argv.slice(2)
	if (!packageDir || !outDir) {
		console.error('usage: node .task/pack.js <packageDir> <outDir>')
		process.exit(2)
	}
	pack(packageDir, outDir)
	console.log(`staged ${packageDir} -> ${outDir}`)
}
