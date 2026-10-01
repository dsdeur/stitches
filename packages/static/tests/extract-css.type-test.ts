// The public signature has to accept what a consumer actually holds: the instance typed by the
// hand-written core and react declarations, not core's internal type the source is written against.
import { createStitches as createCoreStitches } from '../../core/types/index'
import { createStitches as createReactStitches } from '../../react/types/index'
import { bundleCss, extractCss, toPlainCss, utilityClasses, utilityCss } from '../types/index'
import type { ExtractOptions, UtilityClass } from '../types/index'

const core = createCoreStitches({ media: { bp1: '(min-width: 640px)' }, theme: { colors: { text: 'black' } } })
const react = createReactStitches({ prefix: 'app', utils: { px: (value: number) => ({ paddingLeft: value, paddingRight: value }) } })

const button = core.css({ color: '$text', variants: { size: { small: { fontSize: 12 } } } })
const Label = react.styled('span', { px: 4 })

const fromCore: string = extractCss(core, [{ button }])
const fromReact: string = extractCss(react, [{ Label }], { responsive: false })

const options: ExtractOptions = {}
extractCss(core, [], options)

// @ts-expect-error the sources are a list, even for one module
extractCss(core, { button })

// @ts-expect-error something that is not a stitches instance
extractCss({ css: core.css }, [button])

const bundle: string = bundleCss(react, [{ Label }], { utilities: { properties: ['padding'], states: ['hover'] } })
const plain: string = toPlainCss(fromCore)
const vocabulary: UtilityClass[] = utilityClasses(core, { responsive: false })
utilityCss(react)
bundleCss(core, [], { utilities: false })

// @ts-expect-error utilities take options, not a list of classes
bundleCss(core, [], { utilities: ['padding'] })

export { fromCore, fromReact, bundle, plain, vocabulary }
