// What an app writes without stitches: StyleSheet objects made once, combined per render.
import { useContext } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { ThemeName } from './themeName'

const palette = {
	light: { surface: '#ffffff', text: '#111111', muted: '#666666', accent: '#2255ff', border: '#dddddd' },
	dark: { surface: '#1c1c1e', text: '#f2f2f2', muted: '#9a9a9a', accent: '#6f8cff', border: '#333333' },
}

const make = (colors) =>
	StyleSheet.create({
		card: { padding: 8, marginBottom: 4, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
		cardSmall: { padding: 4 },
		cardLarge: { padding: 12 },
		cardAccent: { borderColor: colors.accent },
		title: { fontSize: 15, color: colors.text, fontWeight: '600' },
		titleSmall: { fontSize: 12 },
		titleLarge: { fontSize: 18 },
		titleAccent: { color: colors.accent },
		subtitle: { fontSize: 12, color: colors.muted },
	})

const styles = { light: make(palette.light), dark: make(palette.dark) }

export const Item = ({ item }) => {
	const s = styles[useContext(ThemeName)]
	const large = item.size === 'large'
	const accent = item.tone === 'accent'

	return (
		<View style={[s.card, large ? s.cardLarge : s.cardSmall, accent && s.cardAccent]}>
			<Text style={[s.title, large ? s.titleLarge : s.titleSmall, accent && s.titleAccent]}>{item.title}</Text>
			<Text style={s.subtitle}>{item.subtitle}</Text>
		</View>
	)
}
