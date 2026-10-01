// css() styles applied with useStyle: no component per element, one hook each.
import { Text, View } from 'react-native'
import { cardStyle, subtitleStyle, titleStyle, useStyle } from './cards'

export const Item = ({ item }) => {
	const variants = { size: item.size, tone: item.tone }

	return (
		<View style={useStyle(cardStyle, variants)}>
			<Text style={useStyle(titleStyle, variants)}>{item.title}</Text>
			<Text style={useStyle(subtitleStyle)}>{item.subtitle}</Text>
		</View>
	)
}
