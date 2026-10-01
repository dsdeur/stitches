import * as React from 'react'
import type { NativeConfig, NativeStyle, StyleObject, ThemeValues, VariantsOf } from '../types.ts'
import type { Viewport } from '../media.ts'
import type { MediaContext } from '../mediaContext.ts'
import { createStyleEngine, type CssArgument, type MediaOf, type PropsRecord, type Resolver, type Stitches, type StyleFunction } from '../createStitches.ts'

/**
 * What styled components read while rendering: the theme to resolve tokens with, the window, and
 * which breakpoints hold for it, worked out once by the provider rather than by every component.
 */
interface Environment {
	readonly theme: ThemeValues
	readonly viewport: Viewport | undefined
	readonly media: MediaContext
}

export interface ProviderProps {
	/** A theme from `createTheme()`, or the default one. Inherits the enclosing provider's when left out. */
	readonly theme?: ThemeValues
	/**
	 * The window size breakpoints are read against. `useWindowDimensions()` from react-native is
	 * exactly this shape. Inherits the enclosing provider's when left out; with none, only `@initial`
	 * values apply.
	 */
	readonly viewport?: Viewport
	readonly children?: React.ReactNode
}

/** Props of a styled component: the wrapped component's, its variants, and a `css` override. */
export type StyledProps<Type extends React.ElementType, Variants> = Omit<React.ComponentPropsWithoutRef<Type>, keyof Variants | 'css' | 'as'> &
	Variants & {
		/** Applied last of everything, as on the web. */
		readonly css?: StyleObject
		/** Renders another component in place of the wrapped one, with the same styles. */
		readonly as?: React.ElementType
	}

export type StyledComponent<Type extends React.ElementType, Variants> = React.ForwardRefExoticComponent<React.PropsWithoutRef<StyledProps<Type, Variants>> & React.RefAttributes<React.ComponentRef<Type>>> & {
	/** The style function behind the component, for when you need the style object without rendering. */
	readonly style: StyleFunction<Variants>
}

export interface ReactStitches<Media extends string = never> extends Stitches<Media> {
	/**
	 * `styled(View, { … })` renders `View` with the resolved style in its `style` prop, in front of a
	 * `style` you pass yourself, so yours still wins. Variant props are taken off; everything else is
	 * forwarded, including the ref. `styled(Button, { … })` extends another styled component.
	 */
	readonly styled: <Type extends React.ElementType, const Definitions extends readonly CssArgument[]>(type: Type, ...definitions: Definitions) => StyledComponent<Type, VariantsOf<readonly [Type, ...Definitions], Media>>
	/** Sets the theme and the window size for every styled component below it. Providers nest. */
	readonly Provider: (props: ProviderProps) => React.ReactElement
	/** The theme the nearest provider set, with every token resolved to a value. */
	readonly useTheme: () => ThemeValues
	/**
	 * The style a `css()` function gives for these props, under the nearest provider's theme and
	 * window. No extra component in the tree, so it is the cheapest way to style a hot path:
	 * `<View style={useStyle(card, { size })} />`.
	 */
	readonly useStyle: <Variants>(style: StyleFunction<Variants>, props?: Variants & { readonly css?: StyleObject }) => NativeStyle
}

const isRecord = (value: unknown): value is PropsRecord => typeof value === 'object' && value !== null && !Array.isArray(value)

const isElementType = (value: unknown): value is React.ElementType => typeof value === 'string' || typeof value === 'function' || (typeof value === 'object' && value !== null && '$$typeof' in value)

/**
 * The React Native half of stitches, with components: everything `createStitches` from
 * `@stitches/native` returns, plus `styled`, `Provider` and `useTheme`.
 */
export const createStitches = <const Config extends NativeConfig = NativeConfig>(init?: Config): ReactStitches<MediaOf<Config>> => {
	const engine = createStyleEngine(init ?? {})
	const Context = React.createContext<Environment>({ theme: engine.theme, viewport: undefined, media: engine.mediaFor(undefined) })

	/** What a styled component wraps and how it styles it, so extending one can reach both. */
	const styledParts = new WeakMap<object, { readonly type: React.ElementType; readonly style: StyleFunction<unknown> }>()

	/** The engine's resolver for a style function, or a call through its public signature for one from elsewhere. */
	const toResolver = (style: StyleFunction<unknown>): Resolver => engine.resolverOf(style) ?? ((props, theme) => style(props, theme))

	const styled = <Type extends React.ElementType, const Definitions extends readonly CssArgument[]>(type: Type, ...definitions: Definitions): StyledComponent<Type, VariantsOf<readonly [Type, ...Definitions], MediaOf<Config>>> => {
		const extended = typeof type === 'object' || typeof type === 'function' ? styledParts.get(type) : undefined
		const Type: React.ElementType = extended?.type ?? type
		const style = engine.toStyleFunction(extended ? [extended.style, ...definitions] : definitions)
		const resolve = toResolver(style)
		const variantNames = new Set(style.composers.flatMap((composer) => composer.variantNames))

		const Styled = React.forwardRef<React.ComponentRef<Type>, StyledProps<Type, VariantsOf<readonly [Type, ...Definitions], MediaOf<Config>>>>((props, ref) => {
			const { theme, media } = React.useContext(Context)
			const source: PropsRecord = isRecord(props) ? props : {}

			// The resolver reads the variants and `css` straight from the props; everything else but
			// `as` and `style` is forwarded, so this is the one copy of the props a render makes.
			const forwarded: Record<string, unknown> = {}

			for (const key in source) {
				if (key !== 'css' && key !== 'as' && key !== 'style' && !variantNames.has(key)) forwarded[key] = source[key]
			}

			const resolved = resolve(source, theme, media)
			const passedStyle = source.style

			// React Native flattens a style array, later entries winning, so a style passed in still wins.
			forwarded.style = passedStyle === undefined || passedStyle === null ? resolved : [resolved, passedStyle]

			// React 19 treats `ref` as an ordinary prop; only forward one the caller actually gave.
			if (ref !== null) forwarded.ref = ref

			const as = source.as

			return React.createElement(isElementType(as) ? as : Type, forwarded)
		})

		const typeName = typeof Type === 'string' ? Type : (Type.displayName ?? Type.name ?? 'Component')

		const component = Object.assign(Styled, { displayName: `Styled.${typeName}`, style })

		styledParts.set(component, { type: Type, style })

		return component
	}

	const useStyle = <Variants>(style: StyleFunction<Variants>, props?: Variants & { readonly css?: StyleObject }): NativeStyle => {
		const { theme, media } = React.useContext(Context)
		const resolve = engine.resolverOf(style)

		if (resolve) return resolve(isRecord(props) ? props : {}, theme, media)

		// a style function from another instance: its own path, with this provider's theme
		return style(props, theme)
	}

	const Provider = ({ theme, viewport, children }: ProviderProps): React.ReactElement => {
		const parent = React.useContext(Context)
		const activeTheme = theme ?? parent.theme
		const activeViewport = viewport ?? parent.viewport
		const width = activeViewport?.width
		const height = activeViewport?.height

		// Keyed on the numbers, so `viewport={useWindowDimensions()}` does not re-render every styled
		// component below on each render of the provider.
		const value = React.useMemo<Environment>(() => {
			const size = width === undefined || height === undefined ? undefined : { width, height }

			return { theme: activeTheme, viewport: size, media: engine.mediaFor(size) }
		}, [activeTheme, width, height])

		return React.createElement(Context.Provider, { value }, children)
	}

	return {
		css: <const Arguments extends readonly CssArgument[]>(...args: Arguments): StyleFunction<VariantsOf<Arguments, MediaOf<Config>>> => engine.toStyleFunction(args),
		theme: engine.theme,
		createTheme: engine.createTheme,
		themeMap: engine.themeMap,
		config: engine.config,
		styled,
		Provider,
		useTheme: () => React.useContext(Context).theme,
		useStyle,
	}
}
