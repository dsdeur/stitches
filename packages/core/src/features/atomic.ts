import type { CSSObject, StitchesConfig } from '../types.ts'
import { walkDeclarations } from '../convert/toCssRules.ts'
import { toHash } from '../convert/toHash.ts'
import { toResolvedMediaQueryRanges } from '../convert/toResolvedMediaQueryRanges.ts'
import { toTailDashed } from '../convert/toTailDashed.ts'

/**
 * Atomic output (`createStitches({ atomic: true })`): one class per declaration instead of one per
 * style object, so a declaration used by a hundred components is one rule.
 *
 * What one element gets is decided when it renders, not by where rules sit in the sheet: the style
 * objects that apply are merged in the declared order (composition depth, then base before variants
 * before compound variants, then declaration order, the `css` prop last), and only the winning
 * declaration of each slot keeps its class. A slot is a property under one selector and one set of
 * conditions, so an element never carries two classes that compete for the same thing.
 *
 * The sheet only has to order what can still overlap on one element:
 * - **conditions**: unconditional declarations, then each `config.media` breakpoint in its order,
 *   then any other condition. A breakpoint style therefore beats an unconditional one wherever it
 *   matches, whichever was declared later.
 * - **shorthands**: `padding` before `padding-top`. Merging drops longhands a later shorthand
 *   resets, so a longhand still present was meant to win, and it sorts after.
 * - **pseudo-classes**: in a fixed order, `:link` < `:visited` < `:hover` < `:focus-within` <
 *   `:focus` < `:focus-visible` < `:active` < `:disabled`, so an active button beats a hovered one.
 */
export interface Atom {
	/** The selector template (`&` stands for the atom's class), conditions and property this declaration fills. */
	readonly slot: string
	/** The slot's selector and conditions without the property, for dropping longhands a shorthand resets. */
	readonly scope: string
	readonly property: string
	readonly className: string
	readonly cssText: string
	/** Which sheet group, `atomic<bucket>`, the rule belongs to. */
	readonly bucket: number
	/** Position within the group: shorthand depth, then pseudo-class rank. */
	readonly key: number
}

/** Longhands each shorthand resets, one level down; deeper levels are followed when merging. */
const shorthands: Record<string, readonly string[]> = {
	'all': [],
	'animation': ['animation-name', 'animation-duration', 'animation-timing-function', 'animation-delay', 'animation-iteration-count', 'animation-direction', 'animation-fill-mode', 'animation-play-state'],
	'background': ['background-color', 'background-image', 'background-position', 'background-size', 'background-repeat', 'background-origin', 'background-clip', 'background-attachment'],
	'background-position': ['background-position-x', 'background-position-y'],
	'border': ['border-width', 'border-style', 'border-color', 'border-top', 'border-right', 'border-bottom', 'border-left', 'border-image'],
	'border-top': ['border-top-width', 'border-top-style', 'border-top-color'],
	'border-right': ['border-right-width', 'border-right-style', 'border-right-color'],
	'border-bottom': ['border-bottom-width', 'border-bottom-style', 'border-bottom-color'],
	'border-left': ['border-left-width', 'border-left-style', 'border-left-color'],
	'border-width': ['border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width'],
	'border-style': ['border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style'],
	'border-color': ['border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color'],
	'border-block': ['border-block-start', 'border-block-end', 'border-block-width', 'border-block-style', 'border-block-color'],
	'border-inline': ['border-inline-start', 'border-inline-end', 'border-inline-width', 'border-inline-style', 'border-inline-color'],
	'border-block-start': ['border-block-start-width', 'border-block-start-style', 'border-block-start-color'],
	'border-block-end': ['border-block-end-width', 'border-block-end-style', 'border-block-end-color'],
	'border-inline-start': ['border-inline-start-width', 'border-inline-start-style', 'border-inline-start-color'],
	'border-inline-end': ['border-inline-end-width', 'border-inline-end-style', 'border-inline-end-color'],
	'border-image': ['border-image-source', 'border-image-slice', 'border-image-width', 'border-image-outset', 'border-image-repeat'],
	'border-radius': ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius', 'border-start-start-radius', 'border-start-end-radius', 'border-end-start-radius', 'border-end-end-radius'],
	'column-rule': ['column-rule-width', 'column-rule-style', 'column-rule-color'],
	'columns': ['column-width', 'column-count'],
	'flex': ['flex-grow', 'flex-shrink', 'flex-basis'],
	'flex-flow': ['flex-direction', 'flex-wrap'],
	'font': ['font-style', 'font-variant', 'font-weight', 'font-stretch', 'font-size', 'line-height', 'font-family'],
	'gap': ['row-gap', 'column-gap'],
	'grid': ['grid-template', 'grid-auto-rows', 'grid-auto-columns', 'grid-auto-flow'],
	'grid-template': ['grid-template-rows', 'grid-template-columns', 'grid-template-areas'],
	'grid-area': ['grid-row', 'grid-column'],
	'grid-row': ['grid-row-start', 'grid-row-end'],
	'grid-column': ['grid-column-start', 'grid-column-end'],
	'inset': ['top', 'right', 'bottom', 'left', 'inset-block', 'inset-inline'],
	'inset-block': ['inset-block-start', 'inset-block-end'],
	'inset-inline': ['inset-inline-start', 'inset-inline-end'],
	'list-style': ['list-style-type', 'list-style-position', 'list-style-image'],
	'margin': ['margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'margin-block', 'margin-inline'],
	'margin-block': ['margin-block-start', 'margin-block-end'],
	'margin-inline': ['margin-inline-start', 'margin-inline-end'],
	'mask': ['mask-image', 'mask-mode', 'mask-position', 'mask-size', 'mask-repeat', 'mask-origin', 'mask-clip', 'mask-composite'],
	'outline': ['outline-width', 'outline-style', 'outline-color'],
	'overflow': ['overflow-x', 'overflow-y'],
	'padding': ['padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'padding-block', 'padding-inline'],
	'padding-block': ['padding-block-start', 'padding-block-end'],
	'padding-inline': ['padding-inline-start', 'padding-inline-end'],
	'place-content': ['align-content', 'justify-content'],
	'place-items': ['align-items', 'justify-items'],
	'place-self': ['align-self', 'justify-self'],
	'scroll-margin': ['scroll-margin-top', 'scroll-margin-right', 'scroll-margin-bottom', 'scroll-margin-left'],
	'scroll-padding': ['scroll-padding-top', 'scroll-padding-right', 'scroll-padding-bottom', 'scroll-padding-left'],
	'text-decoration': ['text-decoration-line', 'text-decoration-style', 'text-decoration-color', 'text-decoration-thickness'],
	'transition': ['transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay'],
}

/** Every property a shorthand resets, at any depth. */
const toResets = (property: string): readonly string[] => (shorthands[property] ?? []).flatMap((longhand) => [longhand, ...toResets(longhand)])

const resets = new Map(Object.keys(shorthands).map((property) => [property, toResets(property)]))

const resetsOf = (property: string): readonly string[] => resets.get(property) ?? []

/** How many shorthand levels sit above a property; `border` is 0, `border-top` 1, `border-top-color` 2. */
const depthOf = new Map<string, number>()
{
	const visit = (property: string, depth: number): void => {
		depthOf.set(property, Math.max(depthOf.get(property) ?? 0, depth))
		for (const longhand of shorthands[property] ?? []) visit(longhand, depth + 1)
	}
	for (const property of Object.keys(shorthands)) visit(property, 0)
}

/** Longhands that no shorthand covers are at the deepest level, after every shorthand. */
const longhandDepth = 3

const propertyRank = (property: string): number => (property === 'all' ? 0 : property in shorthands ? (depthOf.get(property) ?? 0) : longhandDepth)

const pseudoClasses = [':link', ':visited', ':hover', ':focus-within', ':focus', ':focus-visible', ':active', ':disabled']

/** The latest of the ordered pseudo-classes a selector uses, 0 for none. */
const pseudoRank = (selector: string): number => {
	let rank = 0

	pseudoClasses.forEach((pseudoClass, index) => {
		// `:focus` must not count where only `:focus-visible` or `:focus-within` is written
		if (new RegExp(`${pseudoClass}(?![\\w-])`).test(selector)) rank = index + 1
	})

	return rank
}

/** Each `config.media` query as `walkDeclarations` writes the condition, mapped to its position. */
const mediaBuckets = new WeakMap<StitchesConfig['media'], Map<string, number>>()

const toBucket = (conditions: readonly string[], config: StitchesConfig): number => {
	let byQuery = mediaBuckets.get(config.media)

	if (!byQuery) {
		byQuery = new Map(Object.values(config.media).map((query, index) => [toResolvedMediaQueryRanges(`@media ${query}`), index + 1]))
		mediaBuckets.set(config.media, byQuery)
	}

	const otherBucket = byQuery.size + 1
	let bucket = 0

	for (const condition of conditions) bucket = Math.max(bucket, byQuery.get(condition) ?? otherBucket)

	return bucket
}

const placeholder = '&'

/** Every declaration of a style object as an atom, in the order the style writes them. */
export const toAtoms = (style: CSSObject, config: StitchesConfig): Atom[] => {
	const atoms: Atom[] = []

	walkDeclarations(
		style,
		[placeholder],
		[],
		config,
		(declaration, selectors, conditions) => {
			const colon = declaration.indexOf(':')
			const property = declaration.charCodeAt(0) === 64 || colon === -1 ? declaration : declaration.slice(0, colon)
			const template = selectors.join(',')
			const scope = `${conditions.join('\u0001')}\u0000${template}`
			const className = `${toTailDashed(config.prefix)}a-${toHash([conditions, template, declaration])}`
			const selector = template.replace(/&/g, `.${className}`)

			atoms.push({
				slot: `${scope}\u0000${property}`,
				scope,
				property,
				className,
				cssText: `${conditions.map((condition) => `${condition}{`).join('')}${selector}{${declaration}}${'}'.repeat(conditions.length)}`,
				bucket: toBucket(conditions, config),
				key: propertyRank(property) * 100 + pseudoRank(template),
			})
		},
		() => undefined,
	)

	return atoms
}

/**
 * Merges atoms in the order given, later winning. A shorthand drops the longhands it resets that
 * came before it in the same scope, as it would in one css rule; `all` drops everything in its scope.
 */
export const mergeAtoms = (merged: Map<string, Atom>, atoms: readonly Atom[]): void => {
	for (const atom of atoms) {
		if (atom.property === 'all') {
			for (const [slot, existing] of merged) if (existing.scope === atom.scope) merged.delete(slot)
		} else {
			for (const longhand of resetsOf(atom.property)) merged.delete(`${atom.scope}\u0000${longhand}`)
		}

		merged.delete(atom.slot)
		merged.set(atom.slot, atom)
	}
}
