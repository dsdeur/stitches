import { createStitches } from '../types/index'
import { createStitches as createReactStitches } from '../../react/types/index'

const { css, config } = createStitches({ atomic: true, media: { md: '(min-width: 768px)' } })

const atomicFlag: boolean = config.atomic
css({ color: 'red', '@md': { color: 'blue' } })

createReactStitches({ atomic: false, cascade: 'declared' })

// @ts-expect-error atomic is a boolean
createStitches({ atomic: 'yes' })

export { atomicFlag }
