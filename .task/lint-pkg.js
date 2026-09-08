// Lints the publishable form of each package (see pack.js), not the checkout manifest, since the
// two differ on purpose. Runs after yarn build.
import { spawnSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pack } from './pack.js'

const root = new URL('../', import.meta.url).pathname
let failed = false

for (const name of ['core', 'react', 'stringify']) {
	const staged = join(mkdtempSync(join(tmpdir(), `stitches-publish-${name}-`)), name)

	pack(join(root, 'packages', name), staged)

	const result = spawnSync(join(root, 'node_modules/.bin/publint'), ['run', '--pack', 'npm', staged], { stdio: 'inherit' })

	if (result.status !== 0) failed = true
}

process.exitCode = failed ? 1 : 0
