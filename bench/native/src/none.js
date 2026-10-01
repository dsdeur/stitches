// The floor: the same views and text, with no styling at all.
import { Text, View } from 'react-native'

export const Item = ({ item }) => (
	<View>
		<Text>{item.title}</Text>
		<Text>{item.subtitle}</Text>
	</View>
)
