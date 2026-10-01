module.exports = (api) => {
	api.cache.using(() => process.env.BENCH_COMPILER ?? '0')

	return {
		presets: ['babel-preset-expo'],
		// only the compiled scenario goes through @stitches/native-babel; every other file is plain
		overrides: [{ test: /src\/compiled\.js$/, plugins: [['module:@stitches/native-babel', { sources: [/\/cards$/] }]] }],
	}
}
