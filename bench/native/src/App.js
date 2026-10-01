// Runs every scenario in the real runtime (Hermes, Fabric) and posts the timings to run.mjs.
//
// Each operation is timed from the state change to the moment React has committed it, which on
// Fabric includes building the native shadow tree on the JavaScript thread ("commit"), and to the
// next frame after that ("frame"). Rounds alternate the order of the implementations, and the first
// round is a warm-up that is not recorded.
import { useLayoutEffect, useRef, useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { dark, Provider, theme } from './cards'
import { ThemeName } from './themeName'
import * as none from './none'
import * as stylesheet from './stylesheet'
import * as styled from './styled'
import * as useStyle from './useStyle'
import * as compiled from './compiled'

const implementations = { none, stylesheet, styled, useStyle, compiled }
const names = Object.keys(implementations)
const count = 400
const rounds = 11

/**
 * The items for a generation. An item that did not change keeps its object, the way immutable app
 * state does, so memoization (React Compiler) can skip its card. A third change size, a fifth tone.
 */
const itemCache = new Map()
const itemsFor = (generation) =>
	Array.from({ length: count }, (_, id) => {
		const size = (id + generation) % 3 === 0 ? 'large' : 'small'
		const tone = (id + generation) % 5 === 0 ? 'accent' : 'plain'
		const key = `${id}:${size}:${tone}`
		let item = itemCache.get(key)
		if (!item) itemCache.set(key, (item = { id, size, tone, title: `Card ${id}`, subtitle: `The subtitle of card number ${id}` }))
		return item
	})

const List = ({ Item, items }) => (
	<ScrollView>
		{items.map((item) => (
			<Item key={item.id} item={item} />
		))}
	</ScrollView>
)

/** Resolves the pending measurement once React has committed: its layout effect runs after the commit. */
const Probe = ({ step, onCommit }) => {
	useLayoutEffect(() => onCommit(step))
	return null
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve(performance.now())))

const median = (values) => {
	const sorted = [...values].sort((a, b) => a - b)
	return sorted[Math.floor(sorted.length / 2)]
}

export const App = () => {
	const [state, setState] = useState({ step: 0, implementation: null, generation: 0, themeName: 'light' })
	const [status, setStatus] = useState('starting')
	const waiting = useRef(null)
	const started = useRef(false)

	const onCommit = (step) => {
		const pending = waiting.current
		if (pending && pending.step === step) {
			waiting.current = null
			pending.resolve(performance.now())
		}
	}

	/** Applies a change and returns how long it took to commit and to reach the next frame. */
	const measure = (change) =>
		new Promise((resolve) => {
			const start = performance.now()
			setState((previous) => {
				const next = { ...change(previous), step: previous.step + 1 }
				waiting.current = {
					step: next.step,
					resolve: async (committed) => {
						const frame = await nextFrame()
						resolve({ commit: committed - start, frame: frame - start })
					},
				}
				return next
			})
		})

	useLayoutEffect(() => {
		if (started.current) return
		started.current = true

		const run = async () => {
			const samples = Object.fromEntries(names.map((name) => [name, { mount: [], update: [], theme: [] }]))

			for (let round = 0; round < rounds; round++) {
				setStatus(`round ${round + 1} of ${rounds}`)
				const order = round % 2 ? [...names].reverse() : names

				for (const name of order) {
					const record = (operation, timing) => {
						if (round > 0) samples[name][operation].push(timing)
					}

					record('mount', await measure((previous) => ({ ...previous, implementation: name, themeName: 'light' })))
					for (let update = 0; update < 3; update++) record('update', await measure((previous) => ({ ...previous, generation: previous.generation + 1 })))
					for (let toggle = 0; toggle < 2; toggle++) record('theme', await measure((previous) => ({ ...previous, themeName: previous.themeName === 'light' ? 'dark' : 'light' })))
					await measure((previous) => ({ ...previous, implementation: null }))
				}
			}

			const results = {}
			for (const name of names) {
				results[name] = {}
				for (const operation of ['mount', 'update', 'theme']) {
					const values = samples[name][operation]
					results[name][operation] = { commit: median(values.map((value) => value.commit)), frame: median(values.map((value) => value.frame)), samples: values.length }
				}
			}

			setStatus('posting results')
			await fetch('http://localhost:8799/results', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ count, rounds: rounds - 1, results }) })
			setStatus('done')
		}

		run().catch((error) => {
			setStatus(`failed: ${error.message}`)
			fetch('http://localhost:8799/results', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: String(error.stack ?? error) }) })
		})
	}, [])

	const Item = state.implementation ? implementations[state.implementation].Item : null
	const items = itemsFor(state.generation)

	return (
		<View style={{ flex: 1, paddingTop: 60 }}>
			<Text testID="status">{status}</Text>
			<ThemeName.Provider value={state.themeName}>
				<Provider theme={state.themeName === 'dark' ? dark : theme}>{Item ? <List Item={Item} items={items} /> : null}</Provider>
			</ThemeName.Provider>
			<Probe step={state.step} onCommit={onCommit} />
		</View>
	)
}
