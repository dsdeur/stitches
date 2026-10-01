import { defineConfig, type UserConfig } from 'tsdown'

/**
 * One build per package, three formats each, matching the file names the hand-rolled
 * esbuild pipeline produced: dist/index.mjs, dist/index.cjs, dist/index.global.js.
 * Types are hand-written in packages/x/types and are not generated here.
 */
const pkg = (name: 'stringify' | 'core' | 'react'): UserConfig => ({
	entry: { index: `packages/${name}/src/index.ts` },
	outDir: `packages/${name}/dist`,
	format: ['esm', 'cjs', 'iife'],
	globalName: 'stitches',
	platform: 'browser',
	target: 'es2020',
	minify: true,
	sourcemap: true,
	dts: false,
	clean: true,
	hash: false,
	external: ['react'],
	outExtensions: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.mjs' }),
	// The IIFE build is dist/index.global.js and reads React from the `React` global, as before.
	outputOptions: (options, format) => (format === 'iife' ? { ...options, entryFileNames: 'index.global.js', globals: { react: 'React' } } : options),
})

/**
 * The native package is built on its own terms: no browser platform and no IIFE global, because
 * nothing in it touches the DOM. Two entries: the main one is React-free, the react one adds
 * `styled` and imports React, which stays external. Its types are generated from the source rather
 * than hand-written like the web packages'; it has no richer public surface to express than what
 * the code already says.
 */
const native: UserConfig = {
	entry: { index: 'packages/native/src/index.ts', react: 'packages/native/src/react/index.ts' },
	external: ['react'],
	outDir: 'packages/native/dist',
	format: ['esm', 'cjs'],
	platform: 'neutral',
	target: 'es2020',
	minify: true,
	sourcemap: true,
	dts: true,
	clean: true,
	hash: false,
	outExtensions: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.mjs' }),
}

/**
 * The static extractor runs at build time in Node, never in a browser, so it has no IIFE global.
 * Its public types are hand-written in packages/static/types, like core's: the source works
 * against core's internal instance type, which is not what a consumer holds.
 */
const staticPackage: UserConfig = {
	entry: { index: 'packages/static/src/index.ts' },
	outDir: 'packages/static/dist',
	format: ['esm', 'cjs'],
	platform: 'node',
	target: 'es2020',
	minify: true,
	sourcemap: true,
	dts: false,
	clean: true,
	hash: false,
	outExtensions: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.mjs' }),
}

/**
 * The Babel plugin runs inside Metro's Babel, in Node, and Babel loads plugins with require(), so the
 * CommonJS build is the one that matters. Written in plain JS; its public types are hand-written.
 */
const nativeBabel: UserConfig = {
	entry: { index: 'packages/native-babel/src/index.js' },
	outDir: 'packages/native-babel/dist',
	format: ['esm', 'cjs'],
	platform: 'node',
	target: 'es2020',
	minify: true,
	sourcemap: true,
	dts: false,
	clean: true,
	hash: false,
	outExtensions: ({ format }) => ({ js: format === 'cjs' ? '.cjs' : '.mjs' }),
}

export default defineConfig([pkg('stringify'), pkg('core'), pkg('react'), native, staticPackage, nativeBabel])
