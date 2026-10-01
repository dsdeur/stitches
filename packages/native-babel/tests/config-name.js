// How an app names the plugin in babel.config.js. Babel rewrites a scoped name `@scope/name` to
// `@scope/babel-plugin-name` before resolving it, so the bare package name fails; `module:` asks it
// to use the name as written. Found by bench/native, the first real app to load the plugin by name.
import { transformSync } from '@babel/core'
import { mkdirSync, writeFileSync } from 'node:fs'

// A project whose node_modules holds the plugin under its package name, pointing at the source, so
// this runs without a build.
const project = new URL('./.generated/config-name/', import.meta.url)
const packageDir = new URL('node_modules/@stitches/native-babel/', project)
mkdirSync(packageDir, { recursive: true })
writeFileSync(new URL('package.json', packageDir), JSON.stringify({ name: '@stitches/native-babel', main: new URL('../src/index.js', import.meta.url).pathname }))

const compile = (plugin) =>
	transformSync('const Card = styled(View, {}); const A = () => <Card />', {
		babelrc: false,
		configFile: false,
		cwd: project.pathname,
		filename: new URL('app.js', project).pathname,
		parserOpts: { plugins: ['jsx'] },
		plugins: [plugin],
	}).code

/** The message a call throws, or '' if it does not. */
const errorOf = (call) => {
	try {
		call()
		return ''
	} catch (error) {
		return error.message
	}
}

describe('naming the plugin in a Babel config', () => {
	test("'module:@stitches/native-babel', as the README says, loads it", () => {
		expect(compile(['module:@stitches/native-babel', {}])).toContain('_styledElement(Card')
	})

	test('the bare package name does not: Babel looks for @stitches/babel-plugin-native-babel', () => {
		expect(errorOf(() => compile(['@stitches/native-babel', {}]))).toContain("Cannot find module '@stitches/babel-plugin-native-babel'")
	})
})
