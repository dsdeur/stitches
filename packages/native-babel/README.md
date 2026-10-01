# @stitches/native-babel

An opt-in Babel plugin for `@stitches/native`. It compiles styled-component JSX so a styled
component costs no component of its own at runtime: `<Card size="large" />` becomes the element
`Card` wraps, with its style, created directly in the parent's render.

React Native and Expo still build every file with Babel (through Metro), so this goes in the app's
`babel.config.js`:

```js
module.exports = {
  presets: ['babel-preset-expo'], // or '@react-native/babel-preset'
  plugins: [['@stitches/native-babel', { sources: ['@my/ui', /\/components\//] }]],
}
```

Nothing changes until you add it, and removing it changes nothing either: the components are the
same, only how they are rendered is.

## What it does

For each JSX element whose tag is a styled component, the plugin replaces the element with a call
to `styledElement(Card, props, key, environment, ...children)` and puts one hook,
`useStitchesEnvironment()`, at the top of the component that renders it. At runtime the call
resolves the style (the same cached lookup `styled()` does) and returns the wrapped element
directly. Anything that turns out not to be a styled component is created exactly as JSX would.

A styled component is recognised by its binding:

- defined in the same file with `styled(...)` (`styledNames` renames it), or
- imported from a module listed in `sources`, by exact name or RegExp.

## What it leaves alone, and why

A compiled element reads the theme and window where it is **created**, in the parent's render; a
component reads them where it is **mounted**. Those agree only if nothing between the two can
provide a different theme. So an element is compiled only when the component returns it through
host elements, fragments, React Native's own components (`transparentSources`), other styled
elements, conditionals, arrays and `.map()` callbacks. Left alone, and still correct:

- an element passed into any other component, as a child or a prop: that component might render a
  stitches `Provider` around it (`<DarkSection><Card /></DarkSection>`);
- an element stored in a variable before it is returned;
- JSX outside a render (module scope, event handlers, `useMemo` callbacks).

## React Compiler

The plugin is written to work with React Compiler (Expo's `experiments.reactCompiler`): the hook
is called unconditionally with a `use…` name, and `styledElement` is a pure function of its
arguments. The environment it receives changes identity exactly when a theme or window above
changes, so a memoized element is recomputed when, and only when, its style can change. This is by
design and reasoning; the test suite does not run React Compiler itself.

## Cost and trade-off

Measured with `docs/bench/native-render.mts` (production React, 1000 cards rendered 21 times):

|                         | vs hand-computed style objects |
| ----------------------- | ------------------------------ |
| `styled(View, …)`       | +15%                           |
| `useStyle(card, props)` | +13%                           |
| compiled by this plugin | +4%                            |

The trade-off: a component containing compiled elements reads the theme and window itself, so it
re-renders when either changes, where uncompiled styled children would have re-rendered on their
own (and, for the window, only the responsive ones).

## Options

| Option               | Default                  |                                                                                                     |
| -------------------- | ------------------------ | --------------------------------------------------------------------------------------------------- |
| `sources`            | `[]`                     | Imports whose bindings are styled components: exact module names or RegExps.                        |
| `styledNames`        | `['styled']`             | What `styled` is called in this code base.                                                          |
| `transparentSources` | `['react-native']`       | Modules whose components never provide a stitches theme.                                            |
| `runtime`            | `@stitches/native/react` | Where `styledElement` and the hook are imported from. Must be the module your components come from. |
