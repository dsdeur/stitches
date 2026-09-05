import { isProcessMeta, getProcessArgOf } from './internal/process.js'
import { lintAll as lintAllEsm } from './lint-esm.js'
import { lintAll as lintAllPkg } from './lint-pkg.js'

export const lintAll = async (opts) => {
	await lintAllEsm(opts)
	await lintAllPkg(opts)
}

if (isProcessMeta(import.meta)) {
	lintAll({
		only: getProcessArgOf('only'),
	}).catch((error) => {
		console.error(error)

		process.exitCode = 1
	})
}
