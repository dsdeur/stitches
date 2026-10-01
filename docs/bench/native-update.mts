/**
 * What @stitches/native costs per update, the case that repeats on a phone: mount 1000 cards once,
 * then re-render them 20 times with a third changing variant each time, and time only the updates.
 *
 *   yarn build && NODE_ENV=production npx tsx docs/bench/native-update.mts
 *   COMPILED=<path to a native dist with styledElement> … to add the compiled path from another build
 *   BEFORE=<path to another native dist's react.mjs> … to A/B that build's styled() in the same run
 *
 * Rendering is react-test-renderer under production React with React Native's test flag, which gives
 * a real reconciler whose host elements are plain objects: no DOM to drown the difference (jsdom's
 * DOM work is about 11 µs per card, so a sub-microsecond difference there is noise). Production
 * react-test-renderer flushes on the scheduler's next macrotask, so each update awaits one; that
 * wait is the same for every case.
 *
 * Cases, each against `plain` (a host element given a style object computed once):
 * - `wrapper`: a forwardRef component that only passes a precomputed style on, the floor for any
 *   wrapper; `fnwrapper` the same as a plain function component;
 * - `styled`: `styled('View', …)`;
 * - `compiled`: what @stitches/native-babel emits, `styledElement` plus one environment hook;
 * - `plain+rc`, `styled+rc`: the same with each unchanged element reused, which is what React
 *   Compiler output does: React then skips those elements entirely.
 */
import * as React from 'react'

Object.assign(globalThis, { IS_REACT_NATIVE_TEST_ENVIRONMENT: true })

const renderer = await import('react-test-renderer')
const native = await import(process.env.COMPILED ?? new URL('../../packages/native/dist/react.mjs', import.meta.url).href)

const tick = () => new Promise((resolve) => setImmediate(resolve))

const definition = {
	'padding': '$2',
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

const stitches = native.createStitches({
	theme: { colors: { surface: 'white', text: 'black', accent: 'blue' }, space: { 1: '4px', 2: '8px', 3: '16px' } },
	media: { tablet: '(min-width: 768px)' },
})
const viewport = { width: 820, height: 1180 }
const style = stitches.css(definition)
const precomputed = { small: style({ size: 'small' }, stitches.theme, viewport), large: style({ size: 'large', tone: 'accent', raised: true }, stitches.theme, viewport) }
const Card = stitches.styled('View', definition)
const Wrapper = React.forwardRef((props: { large: boolean }, ref) => React.createElement('View', { ref, style: props.large ? precomputed.large : precomputed.small }))
// the same as a plain function component: React 19 passes a ref as an ordinary prop
const FunctionWrapper = (props: { large: boolean }) => React.createElement('View', { style: props.large ? precomputed.large : precomputed.small })

const count = 1000
const isLarge = (index: number, generation: number) => (index + generation) % 3 === 0
const largeProps = { size: 'large', tone: 'accent', raised: true }
const smallProps = { size: 'small' }

const lists: Record<string, (props: { generation: number }) => unknown> = {
	plain: ({ generation }) => Array.from({ length: count }, (_, index) => React.createElement('View', { key: index, style: isLarge(index, generation) ? precomputed.large : precomputed.small })),
	wrapper: ({ generation }) => Array.from({ length: count }, (_, index) => React.createElement(Wrapper, { key: index, large: isLarge(index, generation) })),
	fnwrapper: ({ generation }) => Array.from({ length: count }, (_, index) => React.createElement(FunctionWrapper, { key: index, large: isLarge(index, generation) })),
	styled: ({ generation }) => Array.from({ length: count }, (_, index) => React.createElement(Card, { key: index, ...(isLarge(index, generation) ? largeProps : smallProps) })),
}

// BEFORE=<path to another native dist's react.mjs> adds that build's styled() as `before`, interleaved
// with this one, for an A/B in one run (separate runs drift with machine load).
if (process.env.BEFORE) {
	const other = await import(process.env.BEFORE)
	const otherStitches = other.createStitches({
		theme: { colors: { surface: 'white', text: 'black', accent: 'blue' }, space: { 1: '4px', 2: '8px', 3: '16px' } },
		media: { tablet: '(min-width: 768px)' },
	})
	const OtherCard = otherStitches.styled('View', definition)
	const OtherProvider = otherStitches.Provider
	lists.before = ({ generation }) =>
		React.createElement(
			OtherProvider,
			{ viewport },
			Array.from({ length: count }, (_, index) => React.createElement(OtherCard, { key: index, ...(isLarge(index, generation) ? largeProps : smallProps) })),
		)
}

// What React Compiler does to these lists: an element whose inputs did not change is reused, and
// React skips it entirely. Each list keeps the element it made last time per card and props.
const reusing = (make: (index: number, large: boolean) => React.ReactElement) => {
	const made = new Map<string, React.ReactElement>()
	return ({ generation }: { generation: number }) =>
		Array.from({ length: count }, (_, index) => {
			const large = isLarge(index, generation)
			const key = `${index}:${large}`
			let element = made.get(key)
			if (!element) made.set(key, (element = make(index, large)))
			return element
		})
}

lists['plain+rc'] = reusing((index, large) => React.createElement('View', { key: index, style: large ? precomputed.large : precomputed.small }))
lists['styled+rc'] = reusing((index, large) => React.createElement(Card, { key: index, ...(large ? largeProps : smallProps) }))

if (native.styledElement) {
	lists.compiled = ({ generation }) => {
		const environments = native.useStitchesEnvironment()
		return Array.from({ length: count }, (_, index) => native.styledElement(Card, isLarge(index, generation) ? largeProps : smallProps, index, environments))
	}
}

const app = (kind: string, generation: number) => React.createElement(stitches.Provider, { viewport }, React.createElement(lists[kind], { generation }))

const measure = async (kind: string): Promise<number> => {
	const tree = renderer.create(app(kind, 0), { unstable_isConcurrent: false })
	await tick()

	const start = performance.now()
	for (let generation = 1; generation <= 20; generation++) {
		tree.update(app(kind, generation))
		await tick()
	}
	const elapsed = performance.now() - start

	// a guard against measuring nothing: every card must be there
	const rendered = tree.toJSON()
	if (!Array.isArray(rendered) || rendered.length !== count) throw new Error(`${kind}: expected ${count} cards`)
	tree.unmount()

	return elapsed
}

const kinds = Object.keys(lists)
const results: Record<string, number[]> = Object.fromEntries(kinds.map((kind) => [kind, []]))

for (const kind of kinds) await measure(kind)
for (let round = 0; round < 20; round++) {
	for (const kind of round % 2 ? [...kinds].reverse() : kinds) results[kind].push(await measure(kind))
}

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]
const base = median(results.plain)

console.log(`${count} cards, 20 updates each, 20 interleaved rounds (median)`)
for (const kind of kinds) {
	const perCard = ((median(results[kind]) - base) / (count * 20)) * 1e6
	console.log(`  ${kind.padEnd(9)} ${median(results[kind]).toFixed(1)} ms   ${kind === 'plain' ? '' : `${perCard >= 0 ? '+' : ''}${perCard.toFixed(0)} ns per card update`}`)
}
