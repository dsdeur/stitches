// Plain JS on purpose: typing Babel's AST needs @babel/types and @types/babel__core, two
// dependencies this package does not otherwise need. The public types are hand-written in types/,
// the way the web packages' are.

/**
 * @stitches/native-babel: compiles `<Card size="large" />`, where `Card` is a styled component,
 * into `styledElement(Card, { size: 'large' })`. At runtime that renders the wrapped element with
 * its style directly, inside the parent's render, so the styled component costs no component of
 * its own. Anything that turns out not to be a styled component is created exactly as JSX would.
 *
 * Only an element that is created during a render, in the theme and window it will be mounted in,
 * is rewritten: one that a component returns, through host elements, fragments, React Native's own
 * components, other styled elements, conditionals, arrays and `.map()` callbacks. The runtime reads
 * the theme with React's `use` where the element is created, which is only right there; an element
 * stored in a variable, passed as a prop or into another component (which might render a stitches
 * Provider around it) is left alone, and so is JSX outside a render.
 *
 * Options:
 * - `sources`: imports whose bindings are styled components, as exact module names or RegExps.
 *   Components defined in the same file with `styled(...)` are found without it.
 * - `styledNames`: the names `styled` goes by in this code base. Default `['styled']`.
 * - `runtime`: where `styledElement` comes from. Default `@stitches/native/react`.
 * - `transparentSources`: modules whose components never provide a stitches theme, so a styled element
 *   inside them can still be rewritten. Default `['react-native']`.
 */
export default function stitchesNative(api, options = {}) {
	const t = api.types
	const sources = options.sources ?? []
	const styledNames = new Set(options.styledNames ?? ['styled'])
	const runtime = options.runtime ?? '@stitches/native/react'
	const transparentSources = new Set(options.transparentSources ?? ['react-native'])

	const isComponentName = (name) => /^[A-Z]/.test(name)

	const matchesSource = (source) => sources.some((pattern) => (typeof pattern === 'string' ? pattern === source : pattern.test(source)))

	/** Whether a binding is a styled component: imported from a listed source, or `styled(...)` here. */
	const isStyledBinding = (binding) => {
		if (binding.kind === 'module') {
			const declaration = binding.path.parentPath
			return t.isImportDeclaration(declaration.node) && matchesSource(declaration.node.source.value)
		}

		const node = binding.path.node
		if (!t.isVariableDeclarator(node) || !t.isCallExpression(node.init)) return false

		const callee = node.init.callee
		return t.isIdentifier(callee) && styledNames.has(callee.name)
	}

	/** Whether a function is a component: a capitalized declaration or variable, possibly through memo() or forwardRef(). */
	const isComponent = (fn) => {
		// `export default function () {}` has no name, and is a component all the same
		if (t.isFunctionDeclaration(fn.node)) return fn.node.id ? isComponentName(fn.node.id.name) : fn.parentPath.isExportDefaultDeclaration()

		let path = fn.parentPath
		// memo(() => …), forwardRef(() => …), React.memo(…), React.forwardRef(…)
		while (path.isCallExpression() && wrapperName(path.node.callee) !== undefined) path = path.parentPath

		if (path.isVariableDeclarator()) return t.isIdentifier(path.node.id) && isComponentName(path.node.id.name)
		return path.isExportDefaultDeclaration()
	}

	const wrapperName = (callee) => {
		const name = t.isIdentifier(callee) ? callee.name : t.isMemberExpression(callee) && t.isIdentifier(callee.property) ? callee.property.name : undefined
		return name === 'memo' || name === 'forwardRef' ? name : undefined
	}

	/** A function passed straight to `.map()` or `.flatMap()`, which runs while its caller renders. */
	const isMapCallback = (fn) => {
		const call = fn.parentPath
		if (!call.isCallExpression() || call.node.arguments[0] !== fn.node) return false

		const callee = call.node.callee
		return t.isMemberExpression(callee) && t.isIdentifier(callee.property) && (callee.property.name === 'map' || callee.property.name === 'flatMap')
	}

	/**
	 * Whether an enclosing element passes the theme and window through unchanged. Host elements,
	 * fragments, components from `transparentSources` (React Native's own, by default) and styled
	 * components do; any other component might render a stitches Provider around its children.
	 */
	const isTransparent = (opening, path) => {
		const name = opening.name

		if (t.isJSXIdentifier(name)) {
			if (!isComponentName(name.name) || name.name === 'Fragment') return true

			const binding = path.scope.getBinding(name.name)
			if (!binding) return false
			if (isStyledBinding(binding)) return true

			const declaration = binding.path.parentPath
			return binding.kind === 'module' && t.isImportDeclaration(declaration.node) && transparentSources.has(declaration.node.source.value)
		}

		// React.Fragment
		return t.isJSXMemberExpression(name) && t.isJSXIdentifier(name.property) && name.property.name === 'Fragment'
	}

	/**
	 * The component this element can be compiled in, or null: it must be created during that
	 * component's render, in the same theme and window it will be mounted in. A flattened element reads the theme where it is created; a component reads it
	 * where it is mounted. The two agree only if nothing between the element and what the component
	 * returns can provide a theme: so the element must sit, through host elements, fragments,
	 * conditionals, arrays and `.map()` results, in what a component (or its `.map()` callback)
	 * returns. Stored in a variable, passed as a prop or into another component, it is left alone.
	 */
	const componentToFlattenIn = (element, helper) => {
		let path = element

		for (;;) {
			const parent = path.parentPath

			// a child of a styled element this pass already rewrote: `styledElement(Card, props, key, …children)`
			if (helper && parent.isCallExpression() && t.isIdentifier(parent.node.callee, { name: helper.name }) && parent.node.arguments.indexOf(path.node) >= 3) {
				path = parent
				continue
			}

			if (parent.isJSXElement()) {
				if (!isTransparent(parent.node.openingElement, parent)) return null
			} else if (parent.isJSXFragment() || parent.isJSXExpressionContainer() || parent.isArrayExpression() || parent.isSpreadElement() || parent.isParenthesizedExpression()) {
				// passes through
			} else if (parent.isConditionalExpression()) {
				if (path.node === parent.node.test) return null
			} else if (parent.isLogicalExpression()) {
				if (path.node !== parent.node.right) return null
			} else if (parent.isReturnStatement() || (parent.isArrowFunctionExpression() && path.node === parent.node.body)) {
				const fn = parent.isArrowFunctionExpression() ? parent : parent.getFunctionParent()

				if (!fn) return null
				if (!isMapCallback(fn)) return isComponent(fn) ? fn : null

				// a .map() result is safe where the call itself is
				path = fn.parentPath
				continue
			} else return null

			path = parent
		}
	}

	/** `useStitchesEnvironment`, or a numbered variant if the file already uses the name: React Compiler only treats `use…` names as hooks. */
	const hookName = (scope) => {
		let name = 'useStitchesEnvironment'
		for (let suffix = 2; scope.hasBinding(name); suffix++) name = `useStitchesEnvironment${suffix}`
		return name
	}

	const attributeName = (name) => (t.isValidIdentifier(name) ? t.identifier(name) : t.stringLiteral(name))

	/** The JSX attributes as an object expression, and the key on its own; undefined if any cannot be read. */
	const toProps = (attributes) => {
		const properties = []
		let key

		for (const attribute of attributes) {
			if (t.isJSXSpreadAttribute(attribute)) {
				properties.push(t.spreadElement(attribute.argument))
				continue
			}

			// namespaced names (`xlink:href`) have no place in React Native; leave such an element alone
			if (!t.isJSXIdentifier(attribute.name)) return undefined

			const value = attribute.value
			let expression

			if (value === null || value === undefined) expression = t.booleanLiteral(true)
			else if (t.isJSXExpressionContainer(value)) {
				if (t.isJSXEmptyExpression(value.expression)) return undefined
				expression = value.expression
			} else if (t.isStringLiteral(value)) expression = t.stringLiteral(value.value)
			else expression = value

			if (attribute.name.name === 'key') key = expression
			else properties.push(t.objectProperty(attributeName(attribute.name.name), expression))
		}

		return { props: t.objectExpression(properties), key }
	}

	return {
		name: '@stitches/native-babel',
		visitor: {
			JSXElement(path, state) {
				const name = path.node.openingElement.name

				if (!t.isJSXIdentifier(name) || !isComponentName(name.name)) return

				const binding = path.scope.getBinding(name.name)

				if (!binding || !isStyledBinding(binding)) return

				const component = componentToFlattenIn(path, state.styledElement)

				if (!component) return

				const props = toProps(path.node.openingElement.attributes)

				if (!props) return

				const program = path.findParent((parent) => parent.isProgram())

				if (!state.styledElement) {
					state.styledElement = program.scope.generateUidIdentifier('styledElement')
					state.useEnvironment = t.identifier(hookName(program.scope))
					state.environments = new Map()
					program.unshiftContainer(
						'body',
						t.importDeclaration([t.importSpecifier(state.styledElement, t.identifier('styledElement')), t.importSpecifier(state.useEnvironment, t.identifier('useStitchesEnvironment'))], t.stringLiteral(runtime)),
					)
				}

				// one hook per component, at the top of its body: it reads every enclosing provider's theme
				// and window, unconditionally, the way React (and React Compiler) expect a hook
				let environment = state.environments.get(component.node)
				const isNew = !environment

				if (!environment) {
					environment = component.scope.generateUidIdentifier('stitches')
					state.environments.set(component.node, environment)
				}

				const children = t.react.buildChildren(path.node)
				const args = [t.identifier(name.name), props.props, props.key ?? t.identifier('undefined'), t.cloneNode(environment), ...children]

				const call = t.callExpression(t.cloneNode(state.styledElement), args)

				// as a child of other JSX, an expression must sit in braces or it would read as text
				path.replaceWith(path.parentPath.isJSXElement() || path.parentPath.isJSXFragment() ? t.jsxExpressionContainer(call) : call)

				if (isNew) {
					const declaration = t.variableDeclaration('const', [t.variableDeclarator(t.cloneNode(environment), t.callExpression(t.cloneNode(state.useEnvironment), []))])
					const body = component.get('body')

					if (body.isBlockStatement()) body.unshiftContainer('body', declaration)
					else body.replaceWith(t.blockStatement([declaration, t.returnStatement(body.node)]))
				}
			},
		},
	}
}
