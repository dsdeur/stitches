interface ExpectResult {
	toBe(expected: unknown): void
	toBeInstanceOf(expected: new (...args: never[]) => unknown): void
	toEqual(expected: unknown): void
	toThrow(expected?: unknown): Promise<void>
	toNotBe(expected: unknown): void
	toNotBeInstanceOf(expected: new (...args: never[]) => unknown): void
	toNotEqual(expected: unknown): void
	toNotThrow(expected?: unknown): Promise<void>
}

declare function describe(description: string, callback: () => void | Promise<void>): Promise<void>
declare function test(name: string, callback: () => void | Promise<void>): Promise<void>
declare function expect(actual: unknown): ExpectResult
