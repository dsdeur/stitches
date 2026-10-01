// The same JSX as styled.js. babel.config.js runs this file, and only this file, through
// @stitches/native-babel, so the styled components here have no component of their own.
import { Card, Subtitle, Title } from './cards'

export const Item = ({ item }) => (
	<Card size={item.size} tone={item.tone}>
		<Title size={item.size} tone={item.tone}>
			{item.title}
		</Title>
		<Subtitle>{item.subtitle}</Subtitle>
	</Card>
)
