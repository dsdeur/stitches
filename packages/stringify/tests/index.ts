import { stringify } from '../src/index.ts'

describe('stringify()', () => {
	test('stringify() generates CSS with the replacer function for an at-rule', () => {
		const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
		const replaceColor = (val: Record<string, unknown>) => ({ color: val.foreground, backgroundColor: val.background })
		const replacer = (property: string, value: unknown) => {
			if (property === '@color' && isRecord(value)) {
				return replaceColor(value)
			}
			return null
		}

		expect(
			stringify(
				{
					a: {
						'@color': {
							foreground: 'white',
							background: 'black',
						},
						'margin': 0,
					},
				},
				replacer,
			),
		).toEqual('a{' + 'color:white;' + 'background-color:black;' + 'margin:0;' + '}')
	})

	test('stringify() generates CSS with the replacer function for a nested rule', () => {
		const replacer = (property: string, value: unknown) => (property === '@within' ? { '& *': value } : null)

		expect(
			stringify(
				{
					a: {
						'color': 'white',
						'@within': {
							margin: 0,
						},
						'backgroundColor': 'black',
					},
				},
				replacer,
			),
		).toEqual('a{' + 'color:white;' + '}' + 'a *{' + 'margin:0;' + '}' + 'a{' + 'background-color:black;' + '}')
	})

	test('stringify() generates CSS with the replacer function for a @custom-media at-rule', () => {
		const replacements = Object.create(null)
		const replacer = (property: string, value: unknown) => {
			if (property.startsWith('@custom-media ')) {
				replacements[property.slice(14)] = value
			} else if (property.startsWith('@media ') && property.includes('--')) {
				return {
					[property.replace(/\((--[\w-]+)\)/g, (_$0: string, $1: string) => replacements[$1] || $1)]: value,
				}
			} else return null
		}

		expect(
			stringify(
				{
					'@custom-media --foo': '(min-width: 640px)',
					'a': {
						'@media (--foo)': {
							margin: 0,
						},
					},
				},
				replacer,
			),
		).toEqual('@media (min-width: 640px){' + 'a{' + 'margin:0;' + '}' + '}')
	})

	test('stringify() generates CSS with the replacer function for a @when at-rule', () => {
		const replacer = (property: string, value: unknown) => {
			if (property.startsWith('@when ')) {
				return {
					['@media' + property.slice(5)]: value,
				}
			} else return null
		}

		expect(
			stringify(
				{
					a: {
						'@when (min-width: 640px)': {
							margin: 0,
						},
					},
				},
				replacer,
			),
		).toEqual('@media (min-width: 640px){' + 'a{' + 'margin:0;' + '}' + '}')
	})
})
