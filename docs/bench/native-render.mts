/**
 * What @stitches/native costs per render, against the built package.
 *
 *   yarn build && NODE_ENV=production npx tsx docs/bench/native-render.mts
 *
 * Baseline is what a React Native app writes without stitches: a component that passes a style
 * object computed once up front (what `StyleSheet.create` gives you). Against it, the same list
 * rendered through `styled()`, through `useStyle()` (no extra component), and as
 * @stitches/native-babel compiles it (`styledElement`, no component per card). Rounds alternate
 * between the variants to cancel drift; see interleaved.mts for why that matters.
 *
 * Rendering is react-dom/server's renderToString under production React: synchronous, runs every
 * component for real (context, forwardRef, hooks), and the host output is the same for every
 * variant, so the differences are what the components themselves cost. Development React adds
 * per-component bookkeeping no app ships with, and production react-test-renderer cannot be
 * flushed synchronously, which is why neither is used.
 */
import * as React from 'react'
import { renderToString } from 'react-dom/server'

const native = await import(new URL('../../packages/native/dist/react.mjs', import.meta.url).href)

const { styledElement, useStitchesEnvironment } = native

const { styled, css, Provider, useStyle, theme } = native.createStitches({
	theme: { colors: { surface: 'white', text: 'black', accent: 'blue' }, space: { 1: '4px', 2: '8px', 3: '16px' }, radii: { card: '8px' } },
	media: { tablet: '(min-width: 768px)', desktop: '(min-width: 1200px)' },
})

const definition = {
	'padding': '$2',
	'borderRadius': '$card',
	'backgroundColor': '$surface',
	'@tablet': { padding: '$3' },
	'variants': {
		size: { small: { padding: '$1' }, large: { padding: '$3' } },
		tone: { plain: { color: '$text' }, accent: { color: '$accent' } },
		raised: { true: { shadowOpacity: 0.2 } },
	},
	'compoundVariants': [{ size: 'large', tone: 'accent', css: { borderWidth: 1 } }],
	'defaultVariants': { size: 'small', tone: 'plain' },
}

const viewport = { width: 820, height: 1180 }

// Baseline: styles resolved once, by hand, the way StyleSheet.create would hold them.
const cardStyle = css(definition)
const precomputed = {
	small: cardStyle({ size: 'small' }, theme, viewport),
	large: cardStyle({ size: 'large', tone: 'accent', raised: true }, theme, viewport),
}
const PlainCard = (props: { large: boolean; children?: React.ReactNode }) => React.createElement('View', { style: props.large ? precomputed.large : precomputed.small }, props.children)

const StyledCard = styled('View', definition)

// The floor for any wrapper component: one forwardRef layer that only passes a precomputed style on.
const WrapperCard = React.forwardRef((props: { large: boolean; children?: React.ReactNode }, ref) => React.createElement('View', { ref, style: props.large ? precomputed.large : precomputed.small }, props.children))

const HookCard = (props: { large: boolean; children?: React.ReactNode }) => React.createElement('View', { style: useStyle(cardStyle, props.large ? { size: 'large', tone: 'accent', raised: true } : { size: 'small' }) }, props.children)

const count = 1000

/** What @stitches/native-babel compiles the styled list into: one hook, then styledElement calls. */
const CompiledList = ({ generation }: { generation: number }) => {
	const environments = useStitchesEnvironment()
	return Array.from({ length: count }, (_, index) =>
		(index + generation) % 3 === 0 ? styledElement(StyledCard, { size: 'large', tone: 'accent', raised: true }, index, environments) : styledElement(StyledCard, { size: 'small' }, index, environments),
	)
}

const list = (kind: string, generation: number) =>
	React.createElement(
		Provider,
		{ viewport },
		kind === 'compiled'
			? React.createElement(CompiledList, { generation })
			: Array.from({ length: count }, (_, index) => {
					const large = (index + generation) % 3 === 0
					if (kind === 'plain') return React.createElement(PlainCard, { key: index, large })
					if (kind === 'hook') return React.createElement(HookCard, { key: index, large })
					if (kind === 'wrapper') return React.createElement(WrapperCard, { key: index, large })
					return React.createElement(StyledCard, large ? { key: index, size: 'large', tone: 'accent', raised: true } : { key: index, size: 'small' })
				}),
	)

/** Renders the list 21 times, a third of the cards changing variant each time. */
const measure = (kind: string): number => {
	const start = performance.now()
	let html = ''

	for (let generation = 0; generation <= 20; generation++) html = renderToString(list(kind, generation))

	// a guard against measuring nothing: the last generation must be in the output
	if (html.split('<View').length - 1 !== count) throw new Error(`${kind}: expected ${count} rendered cards`)

	return performance.now() - start
}

// useStyle and styledElement are newer than styled; measure them where the build has them
const kinds = ['plain', 'wrapper', 'styled', ...(useStyle ? ['hook'] : []), ...(styledElement ? ['compiled'] : [])]
const results: Record<string, number[]> = Object.fromEntries(kinds.map((kind) => [kind, []]))

// warm up every path, then interleave
for (const kind of kinds) measure(kind)
for (let round = 0; round < 20; round++) {
	for (const kind of round % 2 ? [...kinds].reverse() : kinds) results[kind].push(measure(kind))
}

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
const base = median(results.plain)

console.log(`${count} cards, 21 renders each, 20 interleaved rounds`)
for (const kind of kinds) {
	const sorted = [...results[kind]].sort((a, b) => a - b)
	console.log(`  ${kind.padEnd(7)} min ${sorted[0].toFixed(1)}  median ${median(sorted).toFixed(1)}  max ${sorted[sorted.length - 1].toFixed(1)} ms  (median ${(((median(sorted) - base) / base) * 100).toFixed(1)}% vs plain)`)
}

// The style function alone, warm: what every styled render pays before React does anything.
const props = { size: 'large', tone: 'accent', raised: true }
const N = 500000
for (let i = 0; i < N; i++) cardStyle(props, theme, viewport)
const t0 = performance.now()
for (let i = 0; i < N; i++) cardStyle(props, theme, viewport)
console.log(`style function, warm: ${(((performance.now() - t0) / N) * 1e6).toFixed(0)} ns/op`)
