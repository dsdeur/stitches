import { toTailDashed } from './convert/toTailDashed.ts'

export class ThemeToken {
	token: string
	value: string
	scale: string
	prefix: string

	constructor(token: string | number | null | undefined, value: string | number | null | undefined, scale: string | null | undefined, prefix: string | null | undefined) {
		this.token = token == null ? '' : String(token)
		this.value = value == null ? '' : String(value)
		this.scale = scale == null ? '' : String(scale)
		this.prefix = prefix == null ? '' : String(prefix)
	}

	get computedValue(): string {
		return 'var(' + this.variable + ')'
	}

	get variable(): string {
		return '--' + toTailDashed(this.prefix) + toTailDashed(this.scale) + this.token
	}

	toString(): string {
		return this.computedValue
	}
}
