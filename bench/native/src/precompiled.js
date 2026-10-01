// What @stitches/native-babel would emit if it compiled styled() into the useStyle shape: the theme
// read once per component, each element a plain View or Text with its style looked up, and the
// variants split from the other props at build time. Written by hand to measure that shape before
// the plugin is built to produce it.
import { Text, View } from 'react-native'
import { cardStyle, subtitleStyle, titleStyle, useTheme } from './cards'

export const Item = ({ item }) => {
	const theme = useTheme()

	return (
		<View style={cardStyle({ size: item.size, tone: item.tone }, theme)}>
			<Text style={titleStyle({ size: item.size, tone: item.tone }, theme)}>{item.title}</Text>
			<Text style={subtitleStyle(undefined, theme)}>{item.subtitle}</Text>
		</View>
	)
}
