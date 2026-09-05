import type { internal } from './utility/internal.ts'

// ---------------------------------------------------------------------------
// CSS value types — these match what actually flows through the style pipeline
// ---------------------------------------------------------------------------

/** A single CSS declaration value */
export type CSSValue = string | number | boolean | null | undefined

/** A CSS style object — values are primitives, arrays (for at-rules), or nested objects */
export interface CSSObject {
	[key: string]: CSSValue | CSSValue[] | CSSObject | CSSObject[]
}

// ---------------------------------------------------------------------------
// User-facing init config — what users pass to createStitches()
// ---------------------------------------------------------------------------

export interface StitchesInit {
	prefix?: string
	media?: Record<string, string>
	theme?: ThemeDefinition
	themeMap?: Record<string, string>
	utils?: Record<string, (value: CSSValue) => CSSObject>
	root?: (DocumentOrShadowRoot & Node) | null
}

// ---------------------------------------------------------------------------
// Internal config — normalized from StitchesInit
// ---------------------------------------------------------------------------

export interface StitchesConfig {
	prefix: string
	media: Record<string, string>
	theme: ThemeDefinition
	themeMap: Record<string, string>
	utils: Record<string, (value: CSSValue) => CSSObject>
}

// ---------------------------------------------------------------------------
// Sheet types — a common interface so we don't cast between CSSStyleSheet/mock
// ---------------------------------------------------------------------------

/**
 * The minimal sheet interface both real CSSOM and SSR mocks implement.
 * We use index-access on cssRules and duck-type the rest — this is intentionally
 * loose because the code wraps access in Object() for safety.
 */
export interface SheetLike {
	cssRules: { length: number; [index: number]: SheetRule; splice?: (start: number, deleteCount: number, ...items: SheetRule[]) => void }
	insertRule(cssText: string, index: number): number | void
	deleteRule?(index: number): void
}

/** A rule within a SheetLike — only the properties the code actually reads */
export interface SheetRule {
	cssText: string
	cssRules?: { length: number; [index: number]: SheetRule }
	type?: number | string
	insertRule?(cssText: string, index: number): number | void
}

/** A grouping rule (like @media{}) that contains sub-rules */
export interface GroupRule {
	cssRules: { length: number; [index: number]: SheetRule }
	insertRule(cssText: string, index: number): number | void
	cssText?: string
	type?: number | string
}

export interface RuleGroup {
	group: GroupRule
	index: number
	cache: Set<string | number>
	apply: (cssText: string) => void
}

export interface SheetGroup {
	sheet: SheetLike
	rules: Record<string, RuleGroup>
	reset: () => void
	toString: () => string
}

// ---------------------------------------------------------------------------
// Variant / Composer types
// ---------------------------------------------------------------------------

/** Variant definition: [matchConditions, style, isEmpty, styleHash, responsiveStyleHashes] */
export type VariantDef = [Record<string, string>, CSSObject, boolean, string, Map<string, string>]

/** Composer tuple: [className, style, singularVariants, compoundVariants, prefilledVariants, undefinedVariants] */
export type ComposerTuple = [string, CSSObject, VariantDef[], VariantDef[], Record<string, string>, string[]]

// ---------------------------------------------------------------------------
// Component types
// ---------------------------------------------------------------------------

/** What a component type can be — a tag name, a function, or a React-like component */
export type ComponentType = string | ((...args: never[]) => unknown) | { $$typeof: symbol; [key: string]: unknown }

/** Component internals attached via the internal Symbol */
export interface ComponentInternals {
	type: ComponentType | null
	composers: Set<ComposerTuple>
}

/** Render result returned by a css component function */
export interface RenderResult {
	type: ComponentType
	className: string
	selector: string
	props: Record<string, unknown>
	toString: () => string
	deferredInjector: InjectionDeferrer | null
}

/** A CSS component function with metadata */
export type CssComponentFunction = {
	(props?: Record<string, unknown>): RenderResult
	className: string
	selector: string
	toString: () => string
} & { [K in typeof internal]: ComponentInternals }

// ---------------------------------------------------------------------------
// Injection deferrer — a callable with .rules, compatible with React.FC
// ---------------------------------------------------------------------------

export interface InjectionDeferrer {
	(): null
	rules: Record<string, { apply: (rule: string) => void }>
}

// ---------------------------------------------------------------------------
// Component config (withConfig)
// ---------------------------------------------------------------------------

export interface ComponentConfig {
	componentId?: string
	displayName?: string
	shouldForwardStitchesProp?: (prop: string) => boolean | void
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

export interface ThemeResult {
	className: string
	selector: string
	toString: () => string
	[scale: string]: unknown
}

export type ThemeScale = Record<string, CSSValue>
export type ThemeDefinition = Record<string, ThemeScale>

export type CreateThemeFunction = {
	(style: ThemeDefinition): ThemeResult
	(className: string, style: ThemeDefinition): ThemeResult
}

// ---------------------------------------------------------------------------
// Top-level function signatures
// ---------------------------------------------------------------------------

/** Any composable component — has internal symbol with component internals */
export type Composable = { [K in typeof internal]: ComponentInternals }

/** Valid arg to css()/styled(): a tag name, an existing component, a style object, or a React-like component */
export type CssArg = string | Composable | CSSObject | ((...args: never[]) => unknown) | { $$typeof: symbol }

/** The bare css invocation signature */
export type CssInvocation = (...args: CssArg[]) => CssComponentFunction

export type CssFunction = CssInvocation & {
	withConfig: (config?: ComponentConfig) => CssInvocation
}

export type GlobalCssFunction = {
	(...styles: CSSObject[]): { (): string; toString: () => string }
}

export type KeyframesFunction = {
	(style: CSSObject): { (): string; name: string; toString: () => string }
}

/** Styled component returned by styled() — also a React ForwardRef component at runtime */
export interface StyledComponentResult {
	className: string
	selector: string
	displayName?: string
	toString: () => string
}

/** Styled function type (react only) */
export type StyledFunction = {
	(...args: CssArg[]): StyledComponentResult
	withConfig: (config?: ComponentConfig) => (...args: CssArg[]) => StyledComponentResult
}

// ---------------------------------------------------------------------------
// The return value of createStitches
// ---------------------------------------------------------------------------

export interface StitchesInstance {
	css: CssFunction
	globalCss: GlobalCssFunction
	keyframes: KeyframesFunction
	createTheme: CreateThemeFunction
	reset: () => void
	theme: ThemeResult
	sheet: SheetGroup
	config: StitchesConfig
	prefix: string
	getCssText: () => string
	toString: () => string
}
