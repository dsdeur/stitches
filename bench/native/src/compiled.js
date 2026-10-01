// The same JSX as styled.js. Importing the cards as './cards.js' is what makes babel.config.js run
// this file, and only this file, through @stitches/native-babel: the components here have none of their own.
import { Card, Subtitle, Title } from './cards.js'

export const Item = ({ item }) => (
	<Card size={item.size} tone={item.tone}>
		<Title size={item.size} tone={item.tone}>
			{item.title}
		</Title>
		<Subtitle>{item.subtitle}</Subtitle>
	</Card>
)
