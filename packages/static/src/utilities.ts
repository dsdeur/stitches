import type { StitchesConfig } from '../../core/src/types.ts'
import { toHyphenCase } from '../../core/src/convert/toHyphenCase.ts'
import { toTailDashed } from '../../core/src/convert/toTailDashed.ts'

export interface UtilityOptions {
	/**
	 * The properties to write utilities for, by their camelCase name. Every property in the config's
	 * `themeMap` by default, which is a few thousand classes for a full theme; narrow it for a
	 * smaller file or a shorter vocabulary.
	 */
	readonly properties?: readonly string[]
	/** Also write each utility per breakpoint in `config.media`, as `tablet:padding-2`. On by default. */
	readonly responsive?: boolean
	/** Pseudo-classes to write each utility for, as `hover:color-primary`. None by default. */
	readonly states?: readonly string[]
	/**
	 * Put in front of the utility's own name, after any breakpoint or state: `tablet:hover:ui-padding-2`.
	 * The config's `prefix` and a dash by default, as component classes get.
	 */
	readonly prefix?: string
}

/** One utility class: what goes in a `class` attribute, and the declaration it applies. */
export interface UtilityClass {
	readonly className: string
	readonly property: string
	readonly value: string
	/** The `config.media` name it applies under, if any. */
	readonly media?: string
	/** The pseudo-class it applies under, if any. */
	readonly state?: string
}

/** The config fields utilities are derived from. */
export type UtilityConfig = Pick<StitchesConfig, 'prefix' | 'media' | 'theme' | 'themeMap'>

/** `.tablet\:padding-2`: every character a class attribute allows but a selector does not is escaped. */
export const toClassSelector = (className: string): string => `.${className.replace(/[^\w-]/g, (character) => `\\${character}`)}`

/**
 * Every utility class a config's theme yields: for each property in `themeMap`, one class per token
 * of the scale it maps to, whose value is the token's custom property, so a `createTheme()` class
 * higher up switches it like any component style. A property mapped to several scales gets the
 * tokens of each; where two scales share a token name, the first listed wins, as it does when
 * stitches resolves a bare `$token`.
 */
export const toUtilityClasses = (config: UtilityConfig, { properties, responsive = true, states = [], prefix }: UtilityOptions = {}): UtilityClass[] => {
	const classPrefix = prefix ?? toTailDashed(config.prefix)
	const variablePrefix = toTailDashed(config.prefix)
	const base: UtilityClass[] = []

	for (const property of properties ?? Object.keys(config.themeMap)) {
		const mapped = config.themeMap[property]

		if (mapped === undefined) continue

		const seen = new Set<string>()

		for (const scale of typeof mapped === 'string' ? [mapped] : mapped) {
			for (const token of Object.keys(config.theme[scale] ?? {})) {
				if (seen.has(token)) continue

				seen.add(token)
				base.push({ className: `${classPrefix}${toHyphenCase(property)}-${token}`, property: toHyphenCase(property), value: `var(--${variablePrefix}${scale}-${token})` })
			}
		}
	}

	const withStates = [...base, ...states.flatMap((state) => base.map((utility) => ({ ...utility, className: `${state}:${utility.className}`, state })))]
	const mediaNames = responsive ? Object.keys(config.media) : []

	return [...withStates, ...mediaNames.flatMap((media) => withStates.map((utility) => ({ ...utility, className: `${media}:${utility.className}`, media })))]
}

const toRule = ({ className, property, value, state }: UtilityClass): string => `${toClassSelector(className)}${state ? `:${state}` : ''}{${property}:${value}}`

/**
 * The utility classes as css: unconditional ones first, then one `@media` block per breakpoint in
 * `config.media` order, so a breakpoint's utility beats the plain one the way a later rule does.
 */
export const toUtilityCss = (config: UtilityConfig, utilities: readonly UtilityClass[]): string => {
	let cssText = utilities
		.filter((utility) => utility.media === undefined)
		.map(toRule)
		.join('')

	for (const [media, query] of Object.entries(config.media)) {
		const rules = utilities
			.filter((utility) => utility.media === media)
			.map(toRule)
			.join('')

		if (rules) cssText += `@media ${query}{${rules}}`
	}

	return cssText
}
