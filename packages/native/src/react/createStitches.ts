import * as React from 'react'
import type { NativeConfig, NativeStyle, StyleObject, ThemeValues, VariantsOf } from '../types.ts'
import type { Viewport } from '../media.ts'
import type { MediaContext } from '../mediaContext.ts'
import { createStyleEngine, hasBreakpoint, type CssArgument, type MediaOf, type PropsRecord, type Resolver, type Stitches, type StyleFunction } from '../createStitches.ts'

/**
 * The window as styled components read it: its size, and which breakpoints hold for it, worked out
 * once by the provider rather than by every component. Kept apart from the theme, so a component
 * whose styles cannot depend on the window does not even read it, and a rotation leaves it alone.
 */
interface Window {
	readonly viewport: Viewport | undefined
	readonly media: MediaContext
	/** The theme too, so a responsive component reads one context, not two. */
	readonly theme: ThemeValues
}

/** One instance's theme and breakpoints, as a component that renders compiled styled elements reads them. */
interface Environment {
	readonly theme: ThemeValues
	readonly media: MediaContext
}

/**
 * Every enclosing provider's environment, by instance. What `useStitchesEnvironment()` returns and
 * `styledElement` reads, so one hook serves any number of instances. Its identity changes exactly
 * when a theme or window above changes, which is what lets React Compiler memoize compiled elements.
 */
type Environments = ReadonlyMap<object, Environment>

const EnvironmentsContext = React.createContext<Environments>(new Map())

/** Each styled component's render without a component of its own, for `styledElement`. */
type FlatRender = (props: PropsRecord, key: React.Key | undefined, environments: Environments, children: readonly React.ReactNode[]) => React.ReactElement

const flatRenders = new WeakMap<object, FlatRender>()

/**
 * React 19's `use` may be called conditionally, which is what lets a component read the window only
 * when its styles depend on it. Older React reads it always: correct, just not selective.
 */
const canSkipWindow = typeof React.use === 'function'

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
	const noWindow: Window = { viewport: undefined, media: engine.mediaFor(undefined), theme: engine.theme }
	const defaultEnvironment: Environment = { theme: engine.theme, media: noWindow.media }
	const ThemeContext = React.createContext<ThemeValues>(engine.theme)
	const WindowContext = React.createContext<Window>(noWindow)

	/** Whether a style can depend on the window: a breakpoint in its definitions or its `css` prop, or a per-breakpoint prop. */
	const needsWindow = (style: object, props: PropsRecord, variantNames: Iterable<string>): boolean => {
		if (engine.hasBreakpoints(style) || hasBreakpoint(props.css)) return true

		for (const name of variantNames) if (isRecord(props[name])) return true

		return false
	}

	/**
	 * The theme and the breakpoints in effect, in one context read: the window context (which carries
	 * the theme) when the style needs the window, the theme context alone when it does not, so a
	 * rotation leaves it alone. Older React has no conditional `use`; it always reads the window
	 * context, which is correct, just not selective.
	 */
	const useEnvironment = (needed: boolean): { readonly theme: ThemeValues; readonly media: MediaContext } => {
		if (canSkipWindow) return needed ? React.use(WindowContext) : { theme: React.use(ThemeContext), media: noWindow.media }

		const window = React.useContext(WindowContext)

		return needed ? window : { theme: window.theme, media: noWindow.media }
	}

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

		/**
		 * The props the wrapped component receives: the resolver reads the variants and `css` straight
		 * from the props; everything else but `as` and `style` is forwarded, so this is the one copy of
		 * the props a render makes.
		 */
		const toElementProps = (source: PropsRecord, theme: ThemeValues, media: MediaContext): Record<string, unknown> => {
			const forwarded: Record<string, unknown> = {}

			for (const key in source) {
				if (key !== 'css' && key !== 'as' && key !== 'style' && !variantNames.has(key)) forwarded[key] = source[key]
			}

			const resolved = resolve(source, theme, media)
			const passedStyle = source.style

			// React Native flattens a style array, later entries winning, so a style passed in still wins.
			forwarded.style = passedStyle === undefined || passedStyle === null ? resolved : [resolved, passedStyle]

			return forwarded
		}

		const Styled = React.forwardRef<React.ComponentRef<Type>, StyledProps<Type, VariantsOf<readonly [Type, ...Definitions], MediaOf<Config>>>>((props, ref) => {
			const source: PropsRecord = isRecord(props) ? props : {}
			const { theme, media } = useEnvironment(needsWindow(style, source, variantNames))
			const forwarded = toElementProps(source, theme, media)

			// React 19 treats `ref` as an ordinary prop; only forward one the caller actually gave.
			if (ref !== null) forwarded.ref = ref

			const as = source.as

			return React.createElement(isElementType(as) ? as : Type, forwarded)
		})

		const typeName = typeof Type === 'string' ? Type : (Type.displayName ?? Type.name ?? 'Component')

		const component = Object.assign(Styled, { displayName: `Styled.${typeName}`, style })

		styledParts.set(component, { type: Type, style })

		// What @stitches/native-babel compiles an element of this component into: the wrapped element,
		// styled, with no component of its own. The compiled parent reads the environment with one
		// hook and passes it in, so this is a pure function of its arguments.
		flatRenders.set(component, (source, key, environments, children) => {
			const environment = environments.get(engine) ?? defaultEnvironment
			const forwarded = toElementProps(source, environment.theme, environment.media)

			if (key !== undefined) forwarded.key = key

			const as = source.as

			return React.createElement(isElementType(as) ? as : Type, forwarded, ...children)
		})

		return component
	}

	const useStyle = <Variants>(style: StyleFunction<Variants>, props?: Variants & { readonly css?: StyleObject }): NativeStyle => {
		const source: PropsRecord = isRecord(props) ? props : {}
		const { theme, media } = useEnvironment(needsWindow(style, source, Object.keys(source)))
		const resolve = engine.resolverOf(style)

		if (resolve) return resolve(source, theme, media)

		// a style function from another instance: its own path, with this provider's theme
		return style(props, theme)
	}

	const Provider = ({ theme, viewport, children }: ProviderProps): React.ReactElement => {
		const parentTheme = React.useContext(ThemeContext)
		const parentWindow = React.useContext(WindowContext)
		const activeViewport = viewport ?? parentWindow.viewport
		const width = activeViewport?.width
		const height = activeViewport?.height

		// Keyed on the numbers, so `viewport={useWindowDimensions()}` does not re-render the responsive
		// components below on each render of the provider, only when the size changes.
		const activeTheme = theme ?? parentTheme

		const window = React.useMemo<Window>(() => {
			if (width === undefined || height === undefined) return activeTheme === engine.theme ? noWindow : { ...noWindow, theme: activeTheme }

			const size = { width, height }

			return { viewport: size, media: engine.mediaFor(size), theme: activeTheme }
		}, [width, height, activeTheme])

		// The same, by instance, for components whose styled elements @stitches/native-babel compiled.
		const parentEnvironments = React.useContext(EnvironmentsContext)
		const environments = React.useMemo<Environments>(() => new Map(parentEnvironments).set(engine, { theme: activeTheme, media: window.media }), [parentEnvironments, activeTheme, window])

		return React.createElement(ThemeContext.Provider, { value: activeTheme }, React.createElement(WindowContext.Provider, { value: window }, React.createElement(EnvironmentsContext.Provider, { value: environments }, children)))
	}

	return {
		css: <const Arguments extends readonly CssArgument[]>(...args: Arguments): StyleFunction<VariantsOf<Arguments, MediaOf<Config>>> => engine.toStyleFunction(args),
		theme: engine.theme,
		createTheme: engine.createTheme,
		themeMap: engine.themeMap,
		config: engine.config,
		styled,
		Provider,
		useTheme: () => React.useContext(ThemeContext),
		useStyle,
	}
}

/**
 * The hook @stitches/native-babel puts at the top of a component whose styled elements it compiled:
 * every enclosing provider's theme and window. Not meant to be called by hand.
 */
export const useStitchesEnvironment = (): Environments => React.useContext(EnvironmentsContext)

/**
 * What @stitches/native-babel compiles `<Card size="large" />` into: a styled component renders its
 * wrapped element directly, styled for the environment passed in, with no component of its own;
 * anything else is created exactly as JSX would create it. Not meant to be called by hand.
 */
export const styledElement = (type: React.ElementType, props: PropsRecord | null, key: React.Key | undefined, environments: Environments, ...children: React.ReactNode[]): React.ReactElement => {
	const flat = typeof type === 'string' ? undefined : flatRenders.get(type)

	if (flat) return flat(props ?? {}, key, environments, children)

	return React.createElement(type, key === undefined ? props : { ...props, key }, ...children)
}
