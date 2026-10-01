// BENCH_COMPILER=1 builds with React Compiler (babel-preset-expo carries it); run.mjs builds both ways.
module.exports = {
	name: 'stitches bench',
	slug: 'stitches-native-bench',
	version: '0.0.0',
	ios: {
		bundleIdentifier: 'dev.stitches.bench',
		// the app posts its results to run.mjs on the host
		infoPlist: { NSAppTransportSecurity: { NSAllowsLocalNetworking: true } },
	},
	experiments: { reactCompiler: process.env.BENCH_COMPILER === '1' },
}
