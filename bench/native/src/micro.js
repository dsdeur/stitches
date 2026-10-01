// Times the pieces of a styled element on Hermes itself, outside React's render: what one element
// costs to create each way, in nanoseconds. Answers where `styled` spends what `useStyle` does not,
// since Release Hermes has no sampling profiler to ask.
import { createElement } from 'react'
import { StyleSheet, View } from 'react-native'
import { styledElement } from '@stitches/native/react'
import { Card, cardStyle } from './cards'

const iterations = 20000
const passes = 7

const sheet = StyleSheet.create({ card: { padding: 8 }, small: { padding: 4 }, large: { padding: 12 }, accent: { borderColor: '#2255ff' } })

// the same rotation of variants as the list: a third large, a fifth accent
const propsAt = (i) => ({ size: i % 3 === 0 ? 'large' : 'small', tone: i % 5 === 0 ? 'accent' : 'plain', testID: 'card' })
const inputs = Array.from({ length: 15 }, (_, i) => propsAt(i))
const noEnvironment = new Map()
const variantNames = new Set(['size', 'tone'])

/** What styled's toElementProps does besides resolving: copy every prop but the variants and css/as/style. */
const splitProps = (source) => {
	const forwarded = {}
	for (const key in source) {
		if (key !== 'css' && key !== 'as' && key !== 'style' && !variantNames.has(key)) forwarded[key] = source[key]
	}
	return forwarded
}

const cases = {
	'createElement, StyleSheet styles (the baseline)': (props) => createElement(View, { testID: props.testID, style: [sheet.card, props.size === 'large' ? sheet.large : sheet.small, props.tone === 'accent' && sheet.accent] }),
	'style lookup only: cardStyle(variants)': (props) => cardStyle(props),
	'props split only (for-in copy)': (props) => splitProps(props),
	'lookup + createElement (what useStyle code does)': (props) => createElement(View, { testID: props.testID, style: cardStyle(props) }),
	'styledElement(Card, …) (compiled; styled does this plus a component)': (props) => styledElement(Card, props, undefined, noEnvironment),
}

let sink

const time = (run) => {
	const start = performance.now()
	for (let i = 0; i < iterations; i++) sink = run(inputs[i % inputs.length])
	return ((performance.now() - start) * 1e6) / iterations
}

/** Median nanoseconds per call for each case, cases interleaved per pass. */
export const runMicro = () => {
	const results = Object.fromEntries(Object.keys(cases).map((name) => [name, []]))
	for (let pass = 0; pass <= passes; pass++) {
		for (const [name, run] of Object.entries(cases)) {
			const ns = time(run)
			if (pass > 0) results[name].push(ns)
		}
	}
	const median = (values) => [...values].sort((a, b) => a - b)[values.length >> 1]
	return { iterations, passes, sink: typeof sink, results: Object.fromEntries(Object.entries(results).map(([name, values]) => [name, median(values)])) }
}
