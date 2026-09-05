/** Returns the given value converted to kebab-case. */
export const toHyphenCase = (value: string): string =>
	// ignore kebab-like values
	value.includes('-')
		? value
		: // `msOverflowStyle` is the camelCase form of `-ms-overflow-style`; unlike `Webkit`/`Moz`
			// the `ms` prefix is lower-case, so the leading dash has to be added explicitly
			(/^ms[A-Z]/.test(value) ? '-' : '') +
			// replace any upper-case letter with a dash and the lower-case variant
			value.replace(/[A-Z]/g, (capital) => '-' + capital.toLowerCase())
