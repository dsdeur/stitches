module.exports = (api) => {
	api.cache.using(() => process.env.BENCH_COMPILER ?? '0')

	return {
		presets: ['babel-preset-expo'],
		// Only the compiled scenario goes through @stitches/native-babel: it alone imports the cards as
		// './cards.js', every other file as './cards'. (A per-file `overrides` test would be clearer, but
		// Metro loads this config once without a filename, which Babel rejects for a filename test.)
		plugins: [['module:@stitches/native-babel', { sources: ['./cards.js'] }]],
	}
}
