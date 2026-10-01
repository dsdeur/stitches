// styled() components, rendered as they are.
import { Card, Subtitle, Title } from './cards'

export const Item = ({ item }) => (
	<Card size={item.size} tone={item.tone}>
		<Title size={item.size} tone={item.tone}>
			{item.title}
		</Title>
		<Subtitle>{item.subtitle}</Subtitle>
	</Card>
)
