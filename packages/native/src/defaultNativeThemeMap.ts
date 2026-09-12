/**
 * Which scale a bare `$token` resolves against, per style property.
 *
 * The names are React Native's, so this is not core's map with entries removed: RN has
 * `paddingHorizontal` and `shadowColor`, has no logical properties, and spells several things
 * differently. Where a name exists in both, it maps to the same scale as on the web, so one
 * theme serves both.
 */
const colors = 'colors'
const fonts = 'fonts'
const fontSizes = 'fontSizes'
const fontWeights = 'fontWeights'
const letterSpacings = 'letterSpacings'
const lineHeights = 'lineHeights'
const radii = 'radii'
const borderWidths = 'borderWidths'
const shadows = 'shadows'
const sizes = 'sizes'
const space = 'space'
const zIndices = 'zIndices'

export const defaultNativeThemeMap: Record<string, string> = {
	gap: space,
	columnGap: space,
	rowGap: space,

	margin: space,
	marginTop: space,
	marginRight: space,
	marginBottom: space,
	marginLeft: space,
	marginHorizontal: space,
	marginVertical: space,
	marginStart: space,
	marginEnd: space,

	padding: space,
	paddingTop: space,
	paddingRight: space,
	paddingBottom: space,
	paddingLeft: space,
	paddingHorizontal: space,
	paddingVertical: space,
	paddingStart: space,
	paddingEnd: space,

	top: space,
	right: space,
	bottom: space,
	left: space,
	start: space,
	end: space,
	inset: space,

	width: sizes,
	height: sizes,
	minWidth: sizes,
	maxWidth: sizes,
	minHeight: sizes,
	maxHeight: sizes,
	flexBasis: sizes,

	borderRadius: radii,
	borderTopLeftRadius: radii,
	borderTopRightRadius: radii,
	borderBottomLeftRadius: radii,
	borderBottomRightRadius: radii,
	borderTopStartRadius: radii,
	borderTopEndRadius: radii,
	borderBottomStartRadius: radii,
	borderBottomEndRadius: radii,

	borderWidth: borderWidths,
	borderTopWidth: borderWidths,
	borderRightWidth: borderWidths,
	borderBottomWidth: borderWidths,
	borderLeftWidth: borderWidths,
	borderStartWidth: borderWidths,
	borderEndWidth: borderWidths,

	color: colors,
	backgroundColor: colors,
	borderColor: colors,
	borderTopColor: colors,
	borderRightColor: colors,
	borderBottomColor: colors,
	borderLeftColor: colors,
	borderStartColor: colors,
	borderEndColor: colors,
	shadowColor: colors,
	textDecorationColor: colors,
	textShadowColor: colors,
	tintColor: colors,
	overlayColor: colors,

	// RN 0.76 and newer accept a css box-shadow string here, which is why it takes the same scale
	// as the web's boxShadow.
	boxShadow: shadows,

	fontFamily: fonts,
	fontSize: fontSizes,
	fontWeight: fontWeights,
	letterSpacing: letterSpacings,
	lineHeight: lineHeights,

	zIndex: zIndices,
}
