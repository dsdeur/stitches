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

export default defineConfig([pkg('stringify'), pkg('core'), pkg('react')])
