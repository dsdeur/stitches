// Runs the whole suite a second time with cascade 'declared' forced on (vitest.declared.config.ts)
// and checks the outcome against packages/core/tests/declared-run/allowlist.json:
//   - a test that fails but is not listed         -> unexpected difference, exit 1
//   - a listed test that passes                   -> stale allowlist entry, exit 1
//   - a file that fails to load                   -> exit 1
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'

const root = new URL('../', import.meta.url).pathname
const outputFile = join(mkdtempSync(join(tmpdir(), 'stitches-declared-')), 'results.json')

spawnSync('./node_modules/.bin/vitest', ['run', '--config', 'vitest.declared.config.ts', '--reporter=json', `--outputFile=${outputFile}`], { cwd: root, stdio: 'ignore' })

const results = JSON.parse(readFileSync(outputFile, 'utf8'))
const allowlist = JSON.parse(readFileSync(join(root, 'packages/core/tests/declared-run/allowlist.json'), 'utf8')).allowed
const allowed = new Map(allowlist.map((entry) => [entry.test, entry]))

const failed = new Set()
const fileErrors = []
for (const file of results.testResults) {
	const name = relative(root, file.name)
	if (file.status !== 'passed' && file.assertionResults.every((t) => t.status !== 'failed')) fileErrors.push(`${name}: ${(file.message || '').split('\n')[0]}`)
	for (const test of file.assertionResults) if (test.status === 'failed') failed.add(`${name} > ${test.fullName}`)
}

const unexpectedFailures = [...failed].filter((key) => !allowed.has(key))
const staleEntries = [...allowed.keys()].filter((key) => !failed.has(key))
const expectedDifferences = [...failed].filter((key) => allowed.has(key))

console.log(`declared run: ${results.numPassedTests} identical, ${expectedDifferences.length} expected differences, ${unexpectedFailures.length} unexpected, ${staleEntries.length} stale allowlist entries, ${fileErrors.length} file errors`)
for (const key of expectedDifferences) console.log(`  expected  ${key}  [${allowed.get(key).change}]`)
for (const key of unexpectedFailures) console.log(`  UNEXPECTED ${key}`)
for (const key of staleEntries) console.log(`  STALE     ${key}`)
for (const error of fileErrors) console.log(`  FILE ERROR ${error}`)

process.exitCode = unexpectedFailures.length || staleEntries.length || fileErrors.length ? 1 : 0
