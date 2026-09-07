import React from 'react'

import type { StitchesConfig, SheetGroup, ComponentInternals, ComponentConfig, CssFunction, CssInvocation, CssArg } from '../../../core/src/types.ts'
import { internal } from '../../../core/src/utility/internal.ts'
import { createSheetMemo } from '../../../core/src/utility/createSheetMemo.ts'

import { createCssFunction } from '../../../core/src/features/css.ts'

/** The styled function bound to one sheet. Mirrors ReactStyledFunction in ../createStitches.ts. */
type SheetStyledFunction = {
	(...args: CssArg[]): StyledComponent
	withConfig: (config?: ComponentConfig) => (...args: CssArg[]) => StyledComponent
}

const styledFunctionMemo = createSheetMemo<SheetStyledFunction>()

export type StyledComponent = React.ForwardRefExoticComponent<Record<string, unknown>> & {
	className: string
	selector: string
	/** The forwardRef render function — present at runtime but not in React's types */
	render?: (props?: Record<string, unknown>, ref?: unknown) => React.ReactElement | null
} & { [K in typeof internal]: ComponentInternals }


/** Returns a function that applies component styles. */
export const createStyledFunction = ({ config, sheet }: { config: StitchesConfig; sheet: SheetGroup }) =>
	styledFunctionMemo(sheet, () => {
		const cssFunction = createCssFunction(config, sheet)

		const _styled = (args: CssArg[], css: CssFunction | CssInvocation = cssFunction, { displayName, shouldForwardStitchesProp }: ComponentConfig = {}) => {
			const cssComponent = (css as CssInvocation)(...args)
			const DefaultType = cssComponent[internal].type
			const shouldForwardAs = shouldForwardStitchesProp?.('as')

			const forwardRefComponent = React.forwardRef((props: Record<string, unknown>, ref) => {
				const Type = (props?.as && !shouldForwardAs ? props.as : DefaultType) as React.ElementType

				const { props: forwardProps, deferredInjector } = cssComponent(props)

				if (!shouldForwardAs) {
					delete forwardProps.as
				}

				forwardProps.ref = ref

				if (deferredInjector) {
					return React.createElement(React.Fragment, null, React.createElement(Type, forwardProps), React.createElement(deferredInjector, null))
				}

				return React.createElement(Type, forwardProps)
			})

			const styledComponent: StyledComponent = Object.assign(forwardRefComponent, {
				className: cssComponent.className,
				displayName: displayName || `Styled.${(DefaultType as { displayName?: string; name?: string })?.displayName || (DefaultType as { name?: string })?.name || DefaultType}`,
				selector: cssComponent.selector,
				toString: () => cssComponent.selector,
				[internal]: cssComponent[internal],
			})

			return styledComponent
		}

		const styled = (...args: CssArg[]) => _styled(args)

		styled.withConfig =
			(componentConfig?: ComponentConfig) =>
			(...args: CssArg[]) => {
				const cssWithConfig = cssFunction.withConfig(componentConfig)
				return _styled(args, cssWithConfig, componentConfig)
			}

		return styled
	})
