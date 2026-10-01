/**
 * @stitches/native-babel: compiles styled-component JSX into direct, styled host elements, so a
 * styled component costs no component of its own at runtime. Opt in from babel.config.js:
 *
 * ```js
 * plugins: [['module:@stitches/native-babel', { sources: ['@my/ui', /\/components\//] }]]
 * ```
 */
export interface StitchesNativeBabelOptions {
	/** Imports whose bindings are styled components, as exact module names or patterns. Components defined in the file with `styled(...)` are found without it. */
	readonly sources?: readonly (string | RegExp)[]
	/** The names `styled` goes by in this code base. Default `['styled']`. */
	readonly styledNames?: readonly string[]
	/** Where `styledElement` is imported from. Default `@stitches/native/react`. */
	readonly runtime?: string
	/** Modules whose components never provide a stitches theme, so a styled element inside them can still be rewritten. Default `['react-native']`. */
	readonly transparentSources?: readonly string[]
}

/** A Babel 7 plugin. */
declare function stitchesNative(api: object, options?: StitchesNativeBabelOptions): { readonly name: string; readonly visitor: object }

export default stitchesNative
