const stringifyReplacer = (_name: string, data: unknown) => (typeof data === 'function' ? { '()': Function.prototype.toString.call(data) } : data)

const stringify = (value: unknown): string => JSON.stringify(value, stringifyReplacer)

export const createMemo = () => {
	const cache: Record<string, unknown> = Object.create(null)

	return <V, R>(value: V, apply: (value: V) => R): R => {
		const vjson = stringify(value)

		if (vjson in cache) return cache[vjson] as R
		const result = apply(value)
		cache[vjson] = result
		return result
	}
}
