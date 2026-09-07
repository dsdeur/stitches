import * as Stitches from '../../../packages/react/types/index'
import { createStitches } from '../../../packages/react/types/index'

const { css, styled } = createStitches({
	media: { bp1: '(min-width: 640px)', bp2: '(min-width: 1024px)', bp3: '(min-width: 1280px)', bp4: '(min-width: 1536px)' },
	theme: {
		colors: { red: 'tomato', blue: 'dodgerblue', gray: '#888', green: 'green', yellow: 'gold', pink: 'pink', teal: 'teal' },
		space: { 1: '4px', 2: '8px', 3: '16px', 4: '32px', 5: '64px' },
		fontSizes: { 1: '12px', 2: '14px', 3: '16px', 4: '20px', 5: '24px' },
		radii: { 1: '2px', 2: '4px', 3: '8px' },
		scale1: { a1: '1px', b1: '2px', c1: '3px' },
		scale2: { a2: '2px', b2: '4px', c2: '6px' },
		scale3: { a3: '3px', b3: '6px', c3: '9px' },
		scale4: { a4: '4px', b4: '8px', c4: '12px' },
		scale5: { a5: '5px', b5: '10px', c5: '15px' },
		scale6: { a6: '6px', b6: '12px', c6: '18px' },
		scale7: { a7: '7px', b7: '14px', c7: '21px' },
		scale8: { a8: '8px', b8: '16px', c8: '24px' },
	},
	utils: {
		px: (value: Stitches.PropertyValue<'paddingLeft'>) => ({ paddingLeft: value, paddingRight: value }),
		py: (value: Stitches.PropertyValue<'paddingTop'>) => ({ paddingTop: value, paddingBottom: value }),
		size: (value: Stitches.PropertyValue<'width'>) => ({ width: value, height: value }),
	},
})

const Base = styled('div', { color: '$red' })
export const C1 = styled(Base, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size1: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone1: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round1: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size1: 'lg', tone1: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size1: 'md', tone1: 'primary' },
})
export type P1 = Stitches.VariantProps<typeof C1>
export const s1 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C2 = styled(C1, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size2: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone2: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round2: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size2: 'lg', tone2: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size2: 'md', tone2: 'primary' },
})
export type P2 = Stitches.VariantProps<typeof C2>
export const s2 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C3 = styled(C2, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size3: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone3: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round3: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size3: 'lg', tone3: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size3: 'md', tone3: 'primary' },
})
export type P3 = Stitches.VariantProps<typeof C3>
export const s3 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C4 = styled(C3, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size4: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone4: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round4: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size4: 'lg', tone4: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size4: 'md', tone4: 'primary' },
})
export type P4 = Stitches.VariantProps<typeof C4>
export const s4 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C5 = styled(C4, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size5: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone5: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round5: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size5: 'lg', tone5: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size5: 'md', tone5: 'primary' },
})
export type P5 = Stitches.VariantProps<typeof C5>
export const s5 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C6 = styled(C5, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size6: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone6: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round6: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size6: 'lg', tone6: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size6: 'md', tone6: 'primary' },
})
export type P6 = Stitches.VariantProps<typeof C6>
export const s6 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C7 = styled(C6, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size7: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone7: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round7: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size7: 'lg', tone7: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size7: 'md', tone7: 'primary' },
})
export type P7 = Stitches.VariantProps<typeof C7>
export const s7 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C8 = styled(C7, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size8: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone8: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round8: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size8: 'lg', tone8: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size8: 'md', tone8: 'primary' },
})
export type P8 = Stitches.VariantProps<typeof C8>
export const s8 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C9 = styled(C8, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size9: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone9: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round9: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size9: 'lg', tone9: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size9: 'md', tone9: 'primary' },
})
export type P9 = Stitches.VariantProps<typeof C9>
export const s9 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C10 = styled(C9, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size10: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone10: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round10: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size10: 'lg', tone10: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size10: 'md', tone10: 'primary' },
})
export type P10 = Stitches.VariantProps<typeof C10>
export const s10 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C11 = styled(C10, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size11: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone11: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round11: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size11: 'lg', tone11: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size11: 'md', tone11: 'primary' },
})
export type P11 = Stitches.VariantProps<typeof C11>
export const s11 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C12 = styled(C11, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size12: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone12: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round12: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size12: 'lg', tone12: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size12: 'md', tone12: 'primary' },
})
export type P12 = Stitches.VariantProps<typeof C12>
export const s12 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C13 = styled(C12, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size13: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone13: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round13: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size13: 'lg', tone13: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size13: 'md', tone13: 'primary' },
})
export type P13 = Stitches.VariantProps<typeof C13>
export const s13 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C14 = styled(C13, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size14: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone14: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round14: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size14: 'lg', tone14: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size14: 'md', tone14: 'primary' },
})
export type P14 = Stitches.VariantProps<typeof C14>
export const s14 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C15 = styled(C14, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size15: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone15: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round15: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size15: 'lg', tone15: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size15: 'md', tone15: 'primary' },
})
export type P15 = Stitches.VariantProps<typeof C15>
export const s15 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C16 = styled(C15, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size16: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone16: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round16: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size16: 'lg', tone16: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size16: 'md', tone16: 'primary' },
})
export type P16 = Stitches.VariantProps<typeof C16>
export const s16 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C17 = styled(C16, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size17: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone17: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round17: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size17: 'lg', tone17: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size17: 'md', tone17: 'primary' },
})
export type P17 = Stitches.VariantProps<typeof C17>
export const s17 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C18 = styled(C17, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size18: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone18: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round18: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size18: 'lg', tone18: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size18: 'md', tone18: 'primary' },
})
export type P18 = Stitches.VariantProps<typeof C18>
export const s18 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C19 = styled(C18, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size19: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone19: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round19: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size19: 'lg', tone19: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size19: 'md', tone19: 'primary' },
})
export type P19 = Stitches.VariantProps<typeof C19>
export const s19 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C20 = styled(C19, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size20: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone20: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round20: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size20: 'lg', tone20: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size20: 'md', tone20: 'primary' },
})
export type P20 = Stitches.VariantProps<typeof C20>
export const s20 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C21 = styled(C20, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size21: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone21: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round21: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size21: 'lg', tone21: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size21: 'md', tone21: 'primary' },
})
export type P21 = Stitches.VariantProps<typeof C21>
export const s21 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C22 = styled(C21, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size22: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone22: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round22: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size22: 'lg', tone22: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size22: 'md', tone22: 'primary' },
})
export type P22 = Stitches.VariantProps<typeof C22>
export const s22 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C23 = styled(C22, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size23: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone23: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round23: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size23: 'lg', tone23: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size23: 'md', tone23: 'primary' },
})
export type P23 = Stitches.VariantProps<typeof C23>
export const s23 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C24 = styled(C23, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size24: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone24: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round24: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size24: 'lg', tone24: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size24: 'md', tone24: 'primary' },
})
export type P24 = Stitches.VariantProps<typeof C24>
export const s24 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C25 = styled(C24, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size25: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone25: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round25: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size25: 'lg', tone25: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size25: 'md', tone25: 'primary' },
})
export type P25 = Stitches.VariantProps<typeof C25>
export const s25 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C26 = styled(C25, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size26: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone26: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round26: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size26: 'lg', tone26: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size26: 'md', tone26: 'primary' },
})
export type P26 = Stitches.VariantProps<typeof C26>
export const s26 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C27 = styled(C26, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size27: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone27: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round27: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size27: 'lg', tone27: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size27: 'md', tone27: 'primary' },
})
export type P27 = Stitches.VariantProps<typeof C27>
export const s27 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C28 = styled(C27, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size28: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone28: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round28: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size28: 'lg', tone28: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size28: 'md', tone28: 'primary' },
})
export type P28 = Stitches.VariantProps<typeof C28>
export const s28 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C29 = styled(C28, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size29: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone29: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round29: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size29: 'lg', tone29: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size29: 'md', tone29: 'primary' },
})
export type P29 = Stitches.VariantProps<typeof C29>
export const s29 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C30 = styled(C29, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size30: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone30: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round30: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size30: 'lg', tone30: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size30: 'md', tone30: 'primary' },
})
export type P30 = Stitches.VariantProps<typeof C30>
export const s30 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C31 = styled(C30, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size31: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone31: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round31: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size31: 'lg', tone31: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size31: 'md', tone31: 'primary' },
})
export type P31 = Stitches.VariantProps<typeof C31>
export const s31 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C32 = styled(C31, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size32: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone32: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round32: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size32: 'lg', tone32: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size32: 'md', tone32: 'primary' },
})
export type P32 = Stitches.VariantProps<typeof C32>
export const s32 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C33 = styled(C32, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size33: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone33: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round33: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size33: 'lg', tone33: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size33: 'md', tone33: 'primary' },
})
export type P33 = Stitches.VariantProps<typeof C33>
export const s33 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C34 = styled(C33, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size34: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone34: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round34: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size34: 'lg', tone34: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size34: 'md', tone34: 'primary' },
})
export type P34 = Stitches.VariantProps<typeof C34>
export const s34 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C35 = styled(C34, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size35: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone35: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round35: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size35: 'lg', tone35: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size35: 'md', tone35: 'primary' },
})
export type P35 = Stitches.VariantProps<typeof C35>
export const s35 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C36 = styled(C35, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size36: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone36: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round36: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size36: 'lg', tone36: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size36: 'md', tone36: 'primary' },
})
export type P36 = Stitches.VariantProps<typeof C36>
export const s36 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C37 = styled(C36, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size37: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone37: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round37: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size37: 'lg', tone37: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size37: 'md', tone37: 'primary' },
})
export type P37 = Stitches.VariantProps<typeof C37>
export const s37 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C38 = styled(C37, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size38: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone38: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round38: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size38: 'lg', tone38: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size38: 'md', tone38: 'primary' },
})
export type P38 = Stitches.VariantProps<typeof C38>
export const s38 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C39 = styled(C38, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size39: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone39: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round39: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size39: 'lg', tone39: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size39: 'md', tone39: 'primary' },
})
export type P39 = Stitches.VariantProps<typeof C39>
export const s39 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })

export const C40 = styled(C39, {
	padding: '$2',
	px: '$3',
	py: '$1',
	size: '$3',
	color: '$red',
	borderRadius: '$2',
	fontSize: '$2',
	'&:hover': { color: '$blue', backgroundColor: '$gray' },
	'@bp1': { padding: '$3', fontSize: '$3' },
	'@bp2': { padding: '$4', fontSize: '$4' },
	'@bp3': { padding: '$5', fontSize: '$5' },
	variants: {
		size40: { sm: { fontSize: '$1' }, md: { fontSize: '$2' }, lg: { fontSize: '$3' } },
		tone40: { primary: { backgroundColor: '$blue' }, ghost: { backgroundColor: 'transparent' }, danger: { backgroundColor: '$red' } },
		round40: { true: { borderRadius: '$3' } },
	},
	compoundVariants: [{ size40: 'lg', tone40: 'primary', css: { fontWeight: 700 } }],
	defaultVariants: { size40: 'md', tone40: 'primary' },
})
export type P40 = Stitches.VariantProps<typeof C40>
export const s40 = css({ color: '$red', '@bp4': { color: '$blue' }, px: '$2' })
