/** React Native wants numbers for lengths; everything else stays the string it was. */
const pixels = /^-?(?:\d+(?:\.\d+)?|\.\d+)px$/
const bareNumber = /^-?(?:\d+(?:\.\d+)?|\.\d+)$/

export const toNativeValue = (value: string): string | number => {
	const trimmed = value.trim()

	if (bareNumber.test(trimmed)) return Number(trimmed)
	if (pixels.test(trimmed)) return Number(trimmed.slice(0, -2))

	return value
}
