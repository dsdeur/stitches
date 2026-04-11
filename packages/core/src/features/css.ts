import type { StitchesConfig, SheetGroup, ComposerTuple, ComponentInternals, RenderResult, InjectionDeferrer, CssComponentFunction, ComponentConfig, VariantDef, CSSObject, CssFunction, CssInvocation, ComponentType } from '../types.ts'
import { internal } from '../utility/internal.ts'
import { createMemo } from '../utility/createMemo.ts'
import { define } from '../utility/define.ts'
import { hasNames } from '../utility/hasNames.ts'
import { hasOwn } from '../utility/hasOwn.ts'

import { toCssRules } from '../convert/toCssRules.ts'
import { toHash } from '../convert/toHash.ts'
import { toTailDashed } from '../convert/toTailDashed.ts'
import { createRulesInjectionDeferrer } from '../sheet.ts'

const createCssFunctionMap = createMemo()

/** A css() arg can be a string, an existing component, or a style config object */
type CssArg = string | CssComponentFunction | CSSObject

const isCSSObject = (value: object): value is CSSObject => value.constructor === Object && !('$$typeof' in value)

/** Returns a function that applies component styles. */
export const createCssFunction = (config: StitchesConfig, sheet: SheetGroup): CssFunction =>
	createCssFunctionMap(config, (): CssFunction => {
		const _css = (args: CssArg[], componentConfig: ComponentConfig = {}): CssComponentFunction => {
			const internals: ComponentInternals = {
				type: null,
				composers: new Set<ComposerTuple>(),
			}

			for (const arg of args) {
				if (arg == null) continue

				if (typeof arg === 'string') {
					if (internals.type == null) internals.type = arg
					continue
				}

				// existing css component (has [internal])
				if (internal in arg) {
					const existing = arg as CssComponentFunction
					if (internals.type == null) internals.type = existing[internal].type

					for (const composer of existing[internal].composers) {
						internals.composers.add(composer)
					}
				}
				// non-plain-object (React component, function, etc.)
				else if (!isCSSObject(arg)) {
					if (internals.type == null) internals.type = arg as ComponentType
				}
				// style config object
				else {
					internals.composers.add(createComposer(arg, config, componentConfig))
				}
			}

			const type = internals.type ?? 'span'
			if (!internals.composers.size) internals.composers.add(['PJLV', {}, [], [], {}, []])

			return createRenderer(config, { type, composers: internals.composers }, sheet, componentConfig)
		}

		const css: CssFunction = Object.assign((...args: CssArg[]) => _css(args), {
			withConfig:
				(componentConfig: ComponentConfig): CssInvocation =>
				(...args: CssArg[]) =>
					_css(args, componentConfig),
		})

		return css
	})

/** Style config with optional variant/compound/default fields */
interface StyleConfig extends CSSObject {
	variants?: Record<string, Record<string, CSSObject>>
	compoundVariants?: (Record<string, string | number | boolean> & { css?: CSSObject })[]
	defaultVariants?: Record<string, string | number | boolean>
}

/** Creates a composer from a configuration object. */
const createComposer = (styleConfig: CSSObject, config: StitchesConfig, { componentId, displayName }: ComponentConfig): ComposerTuple => {
	const { variants: initSingularVariants, compoundVariants: initCompoundVariants, defaultVariants: initDefaultVariants, ...style } = styleConfig as StyleConfig
	const hash = componentId || toHash(style)
	const componentNamePrefix = displayName ? 'c-' + displayName + '' : 'c'
	const className = `${toTailDashed(config.prefix)}${componentNamePrefix}-${hash}`

	const singularVariants: VariantDef[] = []

	const compoundVariants: VariantDef[] = []

	const prefilledVariants: Record<string, string> = Object.create(null)

	const undefinedVariants: string[] = []

	if (initDefaultVariants) {
		for (const variantName in initDefaultVariants) {
			prefilledVariants[variantName] = String(initDefaultVariants[variantName])
		}
	}

	if (initSingularVariants) {
		for (const name in initSingularVariants) {
			if (!hasOwn(prefilledVariants, name)) prefilledVariants[name] = 'undefined'

			const variantPairs = initSingularVariants[name]

			for (const pair in variantPairs) {
				const vMatch = { [name]: String(pair) }

				if (String(pair) === 'undefined') undefinedVariants.push(name)

				const vStyle = variantPairs[pair]

				singularVariants.push([vMatch, vStyle, !hasNames(vStyle)])
			}
		}
	}

	if (initCompoundVariants) {
		for (const compoundVariant of initCompoundVariants) {
			const { css: vStyle, ...vMatch } = compoundVariant

			const resolvedStyle: CSSObject = (typeof vStyle === 'object' && vStyle) || {}

			const resolvedMatch: Record<string, string> = {}
			for (const name in vMatch) resolvedMatch[name] = String(vMatch[name])

			compoundVariants.push([resolvedMatch, resolvedStyle, !hasNames(resolvedStyle)])
		}
	}

	return [className, style, singularVariants, compoundVariants, prefilledVariants, undefinedVariants]
}

/** Props passed to a css component at render time */
interface CssProps {
	className?: string
	css?: CSSObject
	[name: string]: unknown
}

type ResolvedInternals = { type: ComponentType; composers: Set<ComposerTuple> }

const createRenderer = (config: StitchesConfig, internals: ResolvedInternals, sheet: SheetGroup, { shouldForwardStitchesProp }: ComponentConfig): CssComponentFunction => {
	const [baseClassName, baseClassNames, prefilledVariants, undefinedVariants] = getPreparedDataFromComposers(internals.composers)

	const hasReactType = typeof internals.type === 'function' || (typeof internals.type === 'object' && !!internals.type.$$typeof)
	const deferredInjector: InjectionDeferrer | null = hasReactType ? createRulesInjectionDeferrer(sheet) : null
	const injectionTarget = (deferredInjector || sheet).rules

	const selector = `.${baseClassName}${baseClassNames.length > 1 ? `:where(.${baseClassNames.slice(1).join('.')})` : ``}`

	const render = (props?: CssProps): RenderResult => {
		props = (typeof props === 'object' && props) || empty

		const forwardProps: CssProps = { ...props }

		type VariantPropValue = string | Record<string, string>
		const variantProps: Record<string, VariantPropValue> = {}

		for (const name in prefilledVariants) {
			if (name in props) {
				if (!shouldForwardStitchesProp?.(name)) delete forwardProps[name]
				const data = props[name]

				if (typeof data === 'object' && data !== null) {
					variantProps[name] = {
						'@initial': prefilledVariants[name],
						...(data as Record<string, string>),
					}
				} else {
					const strData = String(data)

					variantProps[name] = strData === 'undefined' && !undefinedVariants.has(name) ? prefilledVariants[name] : strData
				}
			} else {
				variantProps[name] = prefilledVariants[name]
			}
		}

		const classSet = new Set([...baseClassNames])

		for (const [composerBaseClass, composerBaseStyle, singularVariants, compoundVariants] of internals.composers) {
			if (!sheet.rules.styled.cache.has(composerBaseClass)) {
				sheet.rules.styled.cache.add(composerBaseClass)

				toCssRules(composerBaseStyle, [`.${composerBaseClass}`], [], config, (cssText) => {
					injectionTarget.styled.apply(cssText)
				})
			}

			const singularVariantsToAdd = getTargetVariantsToAdd(singularVariants, variantProps, config.media)
			const compoundVariantsToAdd = getTargetVariantsToAdd(compoundVariants, variantProps, config.media, true)

			for (const variantToAdd of singularVariantsToAdd) {
				if (variantToAdd === undefined) continue

				for (const [vClass, vStyle, isResponsive] of variantToAdd) {
					const variantClassName = `${composerBaseClass}-${toHash(vStyle)}-${vClass}`

					classSet.add(variantClassName)

					const groupCache = (isResponsive ? sheet.rules.resonevar : sheet.rules.onevar).cache
					const targetInjectionGroup = isResponsive ? injectionTarget.resonevar : injectionTarget.onevar

					if (!groupCache.has(variantClassName)) {
						groupCache.add(variantClassName)
						toCssRules(vStyle, [`.${variantClassName}`], [], config, (cssText) => {
							targetInjectionGroup.apply(cssText)
						})
					}
				}
			}

			for (const variantToAdd of compoundVariantsToAdd) {
				if (variantToAdd === undefined) continue

				for (const [vClass, vStyle] of variantToAdd) {
					const variantClassName = `${composerBaseClass}-${toHash(vStyle)}-${vClass}`

					classSet.add(variantClassName)

					if (!sheet.rules.allvar.cache.has(variantClassName)) {
						sheet.rules.allvar.cache.add(variantClassName)

						toCssRules(vStyle, [`.${variantClassName}`], [], config, (cssText) => {
							injectionTarget.allvar.apply(cssText)
						})
					}
				}
			}
		}

		// apply css property styles
		if (typeof forwardProps.css === 'object' && forwardProps.css) {
			const cssStyles = forwardProps.css
			if (!shouldForwardStitchesProp?.('css')) delete forwardProps.css
			const iClass = `${baseClassName}-i${toHash(cssStyles)}-css`

			classSet.add(iClass)

			if (!sheet.rules.inline.cache.has(iClass)) {
				sheet.rules.inline.cache.add(iClass)

				toCssRules(cssStyles, [`.${iClass}`], [], config, (cssText) => {
					injectionTarget.inline.apply(cssText)
				})
			}
		}

		for (const propClassName of String(props.className || '')
			.trim()
			.split(/\s+/)) {
			if (propClassName) classSet.add(propClassName)
		}

		const renderedClassName = [...classSet].join(' ')
		forwardProps.className = renderedClassName

		return {
			type: internals.type,
			className: renderedClassName,
			selector,
			props: forwardProps,
			toString: () => renderedClassName,
			deferredInjector,
		}
	}

	const toString = () => {
		if (!sheet.rules.styled.cache.has(baseClassName)) render()

		return baseClassName
	}

	return define(render, {
		className: baseClassName,
		selector,
		[internal]: internals,
		toString,
	})
}

const getPreparedDataFromComposers = (composers: Iterable<ComposerTuple>): [string, string[], Record<string, string>, Set<string>] => {
	let baseClassName = ''

	const baseClassNames: string[] = []
	const combinedPrefilledVariants: Record<string, string> = {}
	const combinedUndefinedVariants: string[] = []

	for (const [className, , , , prefilledVariants, undefinedVariants] of composers) {
		if (baseClassName === '') baseClassName = className

		baseClassNames.push(className)
		combinedUndefinedVariants.push(...undefinedVariants)

		for (const name in prefilledVariants) {
			const data = prefilledVariants[name]
			if (combinedPrefilledVariants[name] === undefined || data !== 'undefined' || undefinedVariants.includes(data)) combinedPrefilledVariants[name] = data
		}
	}

	return [baseClassName, baseClassNames, combinedPrefilledVariants, new Set(combinedUndefinedVariants)]
}

type ResolvedVariant = [string, CSSObject, boolean]

const getTargetVariantsToAdd = (targetVariants: VariantDef[], variantProps: Record<string, string | Record<string, string>>, media: Record<string, string>, isCompoundVariant?: boolean): (ResolvedVariant[] | undefined)[] => {
	const targetVariantsToAdd: (ResolvedVariant[] | undefined)[] = []

	targetVariants: for (const [vMatch, initialVStyle, vEmpty] of targetVariants) {
		if (vEmpty) continue

		let vStyle = initialVStyle
		let vOrder = 0
		let vName = ''

		let isResponsive = false
		for (vName in vMatch) {
			const vPair = vMatch[vName]
			const pPair = variantProps[vName]

			if (pPair === vPair) continue
			else if (typeof pPair === 'object' && pPair) {
				let didMatch: boolean | undefined
				let qOrder = 0
				let matchedQueries: string[] | undefined
				for (const query in pPair) {
					if (vPair === String(pPair[query])) {
						if (query !== '@initial') {
							const cleanQuery = query.slice(1)
							;(matchedQueries = matchedQueries || []).push(cleanQuery in media ? media[cleanQuery] : query.replace(/^@media ?/, ''))
							isResponsive = true
						}

						vOrder += qOrder
						didMatch = true
					}

					++qOrder
				}
				if (matchedQueries && matchedQueries.length) {
					vStyle = {
						['@media ' + matchedQueries.join(', ')]: vStyle,
					}
				}

				if (!didMatch) continue targetVariants
			} else continue targetVariants
		}
		const bucket = (targetVariantsToAdd[vOrder] = targetVariantsToAdd[vOrder] || [])
		bucket.push([isCompoundVariant ? `cv` : `${vName}-${vMatch[vName]}`, vStyle, isResponsive])
	}

	return targetVariantsToAdd
}

const empty: CssProps = {}
