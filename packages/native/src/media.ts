/**
 * The web config's `media` entries, evaluated against a window size instead of by a browser.
 *
 * Native has no media queries, so the subset that describes a window is read here: `min-` and
 * `max-` width and height, the range syntax (`width >= 640px`, `400px < width <= 700px`),
 * `orientation`, the `screen` and `all` media types, `and`, and comma-separated alternatives. A
 * query using anything else (`hover`, `prefers-color-scheme`, `not`) never matches, rather than
 * matching on a guess: a style that never applies is easier to notice than one that always does.
 */

export interface Viewport {
	readonly width: number
	readonly height: number
}

type Test = (viewport: Viewport) => boolean

const never: Test = () => false
const always: Test = () => true

/** `640px`, `40em`, `40rem` or a bare number, in points. em and rem are 16 points, as a browser's default. */
const toLength = (text: string): number | undefined => {
	const match = /^(-?\d*\.?\d+)(px|em|rem)?$/.exec(text.trim())

	if (!match) return undefined

	return Number(match[1]) * (match[2] === 'em' || match[2] === 'rem' ? 16 : 1)
}

const dimensions = new Set(['width', 'height'])

type Operator = '<' | '<=' | '>' | '>=' | '='

const compare = (left: number, operator: Operator, right: number): boolean => {
	switch (operator) {
		case '<':
			return left < right
		case '<=':
			return left <= right
		case '>':
			return left > right
		case '>=':
			return left >= right
		case '=':
			return left === right
	}
}

/** `a < b` read from the other side is `b > a`. */
const flip: Record<Operator, Operator> = { '<': '>', '<=': '>=', '>': '<', '>=': '<=', '=': '=' }

const isOperator = (text: string): text is Operator => text in flip

/** `(width >= 640px)` or `(400px < width <= 700px)`. */
const toRangeTest = (feature: string): Test | undefined => {
	const parts = feature.split(/\s*(<=|>=|<|>|=)\s*/).map((part) => part.trim())

	// value op name, name op value, or value op name op value
	if (parts.length !== 3 && parts.length !== 5) return undefined

	const name = parts.find((part) => dimensions.has(part))

	if (name !== 'width' && name !== 'height') return undefined

	const tests: Test[] = []

	for (let index = 1; index < parts.length; index += 2) {
		const operator = parts[index]
		const left = parts[index - 1]
		const right = parts[index + 1]

		if (!isOperator(operator)) return undefined

		if (left === name) {
			const length = toLength(right)
			if (length === undefined) return undefined
			tests.push((viewport) => compare(viewport[name], operator, length))
		} else if (right === name) {
			const length = toLength(left)
			if (length === undefined) return undefined
			tests.push((viewport) => compare(viewport[name], flip[operator], length))
		} else return undefined
	}

	return (viewport) => tests.every((test) => test(viewport))
}

/** One parenthesised feature: `(min-width: 640px)`, `(orientation: portrait)` or a range. */
const toFeatureTest = (feature: string): Test => {
	const colon = feature.indexOf(':')

	if (colon === -1) return toRangeTest(feature) ?? never

	const name = feature.slice(0, colon).trim()
	const value = feature.slice(colon + 1).trim()

	if (name === 'orientation') {
		if (value === 'portrait') return (viewport) => viewport.height >= viewport.width
		if (value === 'landscape') return (viewport) => viewport.width > viewport.height
		return never
	}

	const range = /^(min-|max-)?(width|height)$/.exec(name)
	const length = toLength(value)

	if (!range || length === undefined) return never

	const dimension = range[2] === 'width' ? 'width' : 'height'

	if (range[1] === 'min-') return (viewport) => viewport[dimension] >= length
	if (range[1] === 'max-') return (viewport) => viewport[dimension] <= length

	return (viewport) => viewport[dimension] === length
}

/** One alternative: media types and features joined by `and`. */
const toConjunctionTest = (query: string): Test => {
	const tests: Test[] = []

	for (const term of query.split(/\s+and\s+/i)) {
		const trimmed = term.trim().replace(/^only\s+/i, '')

		if (trimmed === 'all' || trimmed === 'screen') continue

		const feature = /^\((.*)\)$/s.exec(trimmed)

		if (!feature) return never

		tests.push(toFeatureTest(feature[1]))
	}

	return tests.length ? (viewport) => tests.every((test) => test(viewport)) : always
}

/** A whole query, as written in `config.media` or after `@media` in a style. */
export const toMediaTest = (query: string): Test => {
	const alternatives = query
		.replace(/^@media\s*/i, '')
		.split(',')
		.map((alternative) => alternative.trim())
		.filter(Boolean)
		.map(toConjunctionTest)

	return (viewport) => alternatives.some((test) => test(viewport))
}
