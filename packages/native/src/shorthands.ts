/**
 * React Native's shorthands and the longhands each one covers.
 *
 * On the web the later of `paddingTop: 10` and `padding: 4` wins, because they are declarations in
 * one cascade. React Native has no order: the more specific property always wins, so
 * `{ paddingTop: 10, padding: 4 }` shows a top padding of 10 whichever was written last. To keep the
 * web's meaning, assigning a shorthand removes the longhands it covers that are already there; a
 * longhand written after a shorthand stays, and React Native lets it win, which is the web result too.
 */
const sides = (prefix: string, suffix = ''): string[] => ['Top', 'Right', 'Bottom', 'Left', 'Start', 'End'].map((side) => `${prefix}${side}${suffix}`)

const covered: { readonly [shorthand: string]: readonly string[] } = {
	padding: [...sides('padding'), 'paddingHorizontal', 'paddingVertical', 'paddingBlock', 'paddingBlockStart', 'paddingBlockEnd', 'paddingInline', 'paddingInlineStart', 'paddingInlineEnd'],
	paddingHorizontal: ['paddingLeft', 'paddingRight', 'paddingStart', 'paddingEnd', 'paddingInline', 'paddingInlineStart', 'paddingInlineEnd'],
	paddingVertical: ['paddingTop', 'paddingBottom', 'paddingBlock', 'paddingBlockStart', 'paddingBlockEnd'],
	margin: [...sides('margin'), 'marginHorizontal', 'marginVertical', 'marginBlock', 'marginBlockStart', 'marginBlockEnd', 'marginInline', 'marginInlineStart', 'marginInlineEnd'],
	marginHorizontal: ['marginLeft', 'marginRight', 'marginStart', 'marginEnd', 'marginInline', 'marginInlineStart', 'marginInlineEnd'],
	marginVertical: ['marginTop', 'marginBottom', 'marginBlock', 'marginBlockStart', 'marginBlockEnd'],
	inset: ['top', 'right', 'bottom', 'left', 'start', 'end', 'insetBlock', 'insetBlockStart', 'insetBlockEnd', 'insetInline', 'insetInlineStart', 'insetInlineEnd'],
	borderWidth: sides('border', 'Width'),
	borderColor: sides('border', 'Color'),
	borderRadius: [
		'borderTopLeftRadius',
		'borderTopRightRadius',
		'borderBottomLeftRadius',
		'borderBottomRightRadius',
		'borderTopStartRadius',
		'borderTopEndRadius',
		'borderBottomStartRadius',
		'borderBottomEndRadius',
		'borderStartStartRadius',
		'borderStartEndRadius',
		'borderEndStartRadius',
		'borderEndEndRadius',
	],
	gap: ['rowGap', 'columnGap'],
}

/** The longhands a property covers, or none when it is not a shorthand. */
export const coveredBy = (property: string): readonly string[] => covered[property] ?? []
