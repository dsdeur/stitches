// One command: build the bench app in Release, run it in an iOS simulator with React Compiler off and
// on, and print what each way of styling costs per operation.
//
//   cd bench/native && node run.mjs            # needs a built repo: yarn build at the root
//   SIMULATOR="iPhone 17" node run.mjs          # a specific simulator; the first iPhone otherwise
//   IOS=26 node run.mjs                         # only simulators of that iOS version
//   MODES=off node run.mjs                      # only one React Compiler mode
//
// Release, because a Debug build runs development React and unoptimized native code, which would
// distort every number here. Results land in results/<mode>.json as well.
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const here = new URL('.', import.meta.url).pathname
const repo = join(here, '../..')
const modes = (process.env.MODES ?? 'off,on').split(',')

const run = (command, args, env = {}) => execFileSync(command, args, { cwd: here, stdio: 'inherit', env: { ...process.env, ...env } })

/** The packages as published: their built files and manifest, copied into the app so Metro resolves React from the app. */
const syncPackages = () => {
	for (const name of ['native', 'native-babel']) {
		const source = join(repo, 'packages', name)
		if (!existsSync(join(source, 'dist'))) throw new Error(`packages/${name}/dist is missing: run yarn build at the repo root first`)
		const target = join(here, '.stitches', name)
		rmSync(target, { recursive: true, force: true })
		mkdirSync(target, { recursive: true })
		cpSync(join(source, 'dist'), join(target, 'dist'), { recursive: true })
		if (existsSync(join(source, 'types'))) cpSync(join(source, 'types'), join(target, 'types'), { recursive: true })
		cpSync(join(source, 'package.json'), join(target, 'package.json'))
	}
}

const pickSimulator = () => {
	const { devices } = JSON.parse(execFileSync('xcrun', ['simctl', 'list', 'devices', 'available', '-j'], { encoding: 'utf8' }))
	const all = Object.entries(devices)
		.filter(([runtime]) => runtime.includes(process.env.IOS ? `iOS-${process.env.IOS}-` : 'iOS'))
		.flatMap(([, list]) => list)
	const wanted = process.env.SIMULATOR
	const device = wanted ? all.find((candidate) => candidate.name === wanted || candidate.udid === wanted) : all.reverse().find((candidate) => candidate.name.startsWith('iPhone'))
	if (!device) throw new Error(`no simulator ${wanted ?? 'iPhone'}${process.env.IOS ? ` on iOS ${process.env.IOS}` : ''} available`)
	if (device.state !== 'Booted') execFileSync('xcrun', ['simctl', 'boot', device.udid])
	return device
}

/**
 * The Release app for the simulator, built with Apple's tools directly: `expo prebuild --clean` writes the
 * iOS project and installs its pods, xcodebuild builds it, and the JS bundle is made in the build's
 * own bundling phase, which sees BENCH_COMPILER from the environment.
 */
const buildApp = (device, env) => {
	run('npx', ['expo', 'prebuild', '--clean', '--platform', 'ios'], { ...env, CI: '1' })

	const ios = join(here, 'ios')
	const workspace = readdirSync(ios).find((entry) => entry.endsWith('.xcworkspace'))
	if (!workspace) throw new Error('expo prebuild wrote no .xcworkspace')
	const scheme = workspace.replace(/\.xcworkspace$/, '')
	const derivedData = join(ios, 'build')

	run('xcodebuild', ['-workspace', join(ios, workspace), '-scheme', scheme, '-configuration', 'Release', '-sdk', 'iphonesimulator', '-destination', `id=${device.udid}`, '-derivedDataPath', derivedData, '-quiet', 'build'], env)

	return join(derivedData, 'Build/Products/Release-iphonesimulator', `${scheme}.app`)
}

/** Stops the app if it is running; simctl reports an error when it is not, which is fine here. */
const terminate = (device) => {
	try {
		execFileSync('xcrun', ['simctl', 'terminate', device.udid, 'dev.stitches.bench'], { stdio: 'ignore' })
	} catch {
		// not running
	}
}

/** A simulator app is a process on this Mac, so whether it still runs is a signal-0 check. */
const isRunning = (pid) => {
	try {
		process.kill(pid, 0)
		return true
	} catch {
		return false
	}
}

/** Waits for the app to post its results, and stops waiting when the app exits without doing so. */
const receiveResults = (timeoutMs) => {
	let watchedPid
	const results = new Promise((resolve, reject) => {
		const finish = (settle, value) => {
			server.close()
			clearTimeout(timer)
			clearInterval(watch)
			settle(value)
		}
		const server = createServer((request, response) => {
			let body = ''
			request.on('data', (chunk) => (body += chunk))
			request.on('end', () => {
				response.end('ok')
				const parsed = JSON.parse(body)
				parsed.error ? finish(reject, new Error(parsed.error)) : finish(resolve, parsed)
			})
		})
		const timer = setTimeout(() => finish(reject, new Error('no results within the timeout')), timeoutMs)
		const watch = setInterval(() => {
			if (watchedPid && !isRunning(watchedPid)) finish(reject, new Error('the app exited before posting results: see ~/Library/Logs/DiagnosticReports'))
		}, 2000)
		server.listen(8799)
	})
	return { results, watch: (pid) => (watchedPid = pid) }
}

const format = (ms) => ms.toFixed(2).padStart(7)

const report = (mode, { count, rounds, results }) => {
	console.log(`\nReact Compiler ${mode}: ${count} cards, median of ${rounds} rounds, milliseconds from state change`)
	for (const operation of ['mount', 'update', 'theme']) {
		console.log(`\n  ${operation.padEnd(10)}   commit     frame    styling share of commit`)
		const floor = results.none[operation].commit
		for (const [name, timings] of Object.entries(results)) {
			const { commit, frame } = timings[operation]
			const share = name === 'none' ? '' : `${(((commit - floor) / commit) * 100).toFixed(0).padStart(3)}%  (+${(commit - floor).toFixed(2)} ms over no styling)`
			console.log(`  ${name.padEnd(10)} ${format(commit)} ${format(frame)}    ${share}`)
		}
	}
}

syncPackages()
run('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'])

const device = pickSimulator()
console.log(`simulator: ${device.name} (${device.udid})`)
mkdirSync(join(here, 'results'), { recursive: true })

for (const mode of modes) {
	const env = { BENCH_COMPILER: mode === 'on' ? '1' : '0' }

	// Metro caches transformed files by content, not by this environment variable.
	for (const cache of [join(here, 'node_modules/.cache'), join(here, '.expo')]) rmSync(cache, { recursive: true, force: true })
	for (const entry of readdirSync(tmpdir())) {
		if (entry.startsWith('metro-') || entry.startsWith('haste-map')) rmSync(join(tmpdir(), entry), { recursive: true, force: true })
	}

	console.log(`\nbuilding with React Compiler ${mode} (Release)…`)
	const app = buildApp(device, env)

	// installed and launched with simctl, which needs no Simulator window: the run works over SSH
	const { results, watch } = receiveResults(15 * 60 * 1000)
	terminate(device)
	run('xcrun', ['simctl', 'install', device.udid, app])
	// prints "dev.stitches.bench: <pid>"
	const launched = execFileSync('xcrun', ['simctl', 'launch', device.udid, 'dev.stitches.bench'], { encoding: 'utf8' }).trim()
	console.log(launched)
	watch(Number(launched.split(': ').pop()))

	const received = await results
	terminate(device)
	writeFileSync(join(here, 'results', `${mode}.json`), `${JSON.stringify(received, null, 2)}\n`)
	report(mode, received)
}
