// The card every scenario renders, styled with stitches. The same look is written by hand in
// stylesheet.js, so the scenarios differ only in how the style gets there.
import { Text, View } from 'react-native'
import { createStitches } from '@stitches/native/react'

export const { styled, css, Provider, createTheme, theme, useStyle, useTheme } = createStitches({
	theme: {
		colors: { surface: '#ffffff', text: '#111111', muted: '#666666', accent: '#2255ff', border: '#dddddd' },
		space: { 1: '4px', 2: '8px', 3: '12px' },
		radii: { card: '8px' },
		fontSizes: { 1: '12px', 2: '15px', 3: '18px' },
	},
})

export const dark = createTheme({ colors: { surface: '#1c1c1e', text: '#f2f2f2', muted: '#9a9a9a', accent: '#6f8cff', border: '#333333' } })

export const cardStyle = css({
	padding: '$2',
	marginBottom: '$1',
	borderRadius: '$card',
	borderWidth: 1,
	borderColor: '$border',
	backgroundColor: '$surface',
	variants: {
		size: { small: { padding: '$1' }, large: { padding: '$3' } },
		tone: { plain: {}, accent: { borderColor: '$accent' } },
	},
	defaultVariants: { size: 'small', tone: 'plain' },
})

export const titleStyle = css({
	fontSize: '$2',
	color: '$text',
	fontWeight: '600',
	variants: { size: { small: { fontSize: '$1' }, large: { fontSize: '$3' } }, tone: { plain: {}, accent: { color: '$accent' } } },
	defaultVariants: { size: 'small', tone: 'plain' },
})

export const subtitleStyle = css({ fontSize: '$1', color: '$muted' })

export const Card = styled(View, cardStyle)
export const Title = styled(Text, titleStyle)
export const Subtitle = styled(Text, subtitleStyle)
