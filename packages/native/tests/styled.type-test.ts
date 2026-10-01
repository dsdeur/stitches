// A styled component's props are the wrapped component's, minus what the variants replace, plus the
// variants — plain or per breakpoint, with the config's breakpoint names.
import * as React from 'react'
import { createStitches } from '../src/react/index.ts'
import { createStitches as createPlainStitches } from '../src/index.ts'

const View = (props: { style?: unknown; testID?: string; accessible?: boolean }) => React.createElement('View', props)

const { styled, css, useStyle } = createStitches({ media: { tablet: '(min-width: 768px)', desktop: '(min-width: 1200px)' } })

const Card = styled(View, { variants: { size: { small: { padding: 4 }, large: { padding: 8 } }, raised: { true: { shadowOpacity: 0.2 } } } })

React.createElement(Card, { size: 'large', raised: true, testID: 'card', accessible: true })
React.createElement(Card, { size: { '@initial': 'small', '@tablet': 'large' } })
React.createElement(Card, { size: { '@media (orientation: landscape)': 'large' } })
React.createElement(Card, { css: { padding: 2 }, style: { margin: 1 } })

// @ts-expect-error a value the variant does not define
React.createElement(Card, { size: 'huge' })

// @ts-expect-error a breakpoint the config does not name
React.createElement(Card, { size: { '@phone': 'large' } })

// @ts-expect-error a prop neither the variants nor the wrapped component take
React.createElement(Card, { tone: 'brand' })

const Extended = styled(Card, { variants: { tone: { brand: { color: 'blue' } } } })

React.createElement(Extended, { size: 'small', tone: 'brand', testID: 'extended' })

// @ts-expect-error still checked after extending
React.createElement(Extended, { tone: 'quiet' })

// the style function behind a component takes the same variants
Card.style({ size: { '@desktop': 'small' } })

// @ts-expect-error and checks them the same way
Card.style({ size: 'huge' })

// a css() style function can be wrapped as well
const box = css({ variants: { tone: { muted: { opacity: 0.5 } } } })
const Box = styled(View, box)
React.createElement(Box, { tone: 'muted' })

// useStyle takes a css() function and its variants, plain or per breakpoint
const panel = css({ variants: { size: { small: { padding: 4 } } } })
useStyle(panel, { size: { '@tablet': 'small' } })
useStyle(panel)

// @ts-expect-error useStyle checks the variants like a call would
useStyle(panel, { size: 'huge' })

// Without media in the config there are no breakpoint names to use.
const plain = createPlainStitches({})
const button = plain.css({ variants: { size: { small: { padding: 4 } } } })
button({ size: { '@initial': 'small' } })

// @ts-expect-error no breakpoint of that name
button({ size: { '@tablet': 'small' } })
