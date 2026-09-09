# How the cascade works

When two styles set the same property, which one wins? This page answers that, for both
modes of the `cascade` option.

```js
createStitches({ cascade: 'declared' }) // or 'legacy' (the default today)
```

- **`'legacy'`** is stitches as it has always behaved: for rules of the same kind, the one
  that rendered first wins. Order therefore depends on which component mounted first,
  which depends on the route the user landed on. This is why overriding a variant often
  needed `!important`.
- **`'declared'`** makes order a function of what you wrote, never of what rendered first.
  It follows normal CSS reasoning: later declarations overwrite earlier ones.

Both modes are supported. `'legacy'` stays the default until 2.0 and remains available for
one major after that. Server and client must run the same mode.

## The rules, in order

Within stitches-generated rules, order is decided by the first of these that differs.

### 1. Composition depth

In `styled(A, over)`, everything in `over` beats everything in `A` — its base styles and
its variants alike. Deeper always wins.

```js
const Base = styled('button', { variants: { tone: { brand: { color: 'blue' } } } })
const Extended = styled(Base, { color: 'red' })

<Extended tone="brand" /> // red. In 'legacy' this needed color: 'red !important'.
```

Two consequences worth knowing:

- **A variant name belongs to the depth that first declared it.** If an extension adds
  values or a `defaultVariants` entry to a variant the base declared, all of that
  variant's rules sort at the base's position; values added deeper sort after inherited
  ones. Without this, an extension's default would beat a responsive value from the base.
- **`styled(SomeReactComponent, ...)` counts as the outermost layer.** Stitches cannot see
  how deep the component's own styles are, so it is treated as the deepest.

### 2. Kind, within one depth

`base` < `variants` < `compound variants`. The `css` prop stays last of everything.

### 3. Declaration order, within one kind

Two variants of one component that set the same property: the one declared **later** in the
object wins. Compound variants likewise, in array order.

```js
const Button = styled('button', {
  variants: {
    tone: { brand: { color: 'blue' } },
    muted: { true: { color: 'gray' } }, // wins over tone, being declared later
  },
})
```

To make an earlier variant win regardless, use a compound variant — those sort after all
plain variants at the same depth.

### 4. Breakpoint order, within one variant

**Media queries grant no priority of their own**, exactly as in hand-written CSS. Two
different variants are ordered by rule 3 whatever their breakpoints; a responsive value
does not outrank a non-responsive one from a different variant.

Among the values of a *single* variant, rules follow the key order of `config.media`, with
`@initial` first. A desktop-first `max-width` config therefore works the same way as a
mobile-first `min-width` one: whichever you listed later wins where both match.

### 5. Themes and globals

`createTheme` and `globalCss` output stays where it is today: first in the sheet, so
component styles win over globals.

## What has no answer

Two unrelated components merged through `className`:

```js
<div className={`${cardStyles()} ${overrideStyles()}`} />
```

There is no declared relationship between them, so there is no declared order. Both modes
resolve this by sheet position, which is not something to rely on. Use the `css` prop, or
extend one component from the other, so a depth relationship exists.

## Migrating an existing codebase

Every difference below turns "depends on which page rendered first" into "depends on what
you wrote". Pages that already rendered consistently see no change. The ones that change
are the ones that were flaky across navigation.

| Situation | `'legacy'` | `'declared'` | Fix |
|---|---|---|---|
| `styled(A, { color })` where `A` has a variant setting `color` | variant wins | extension wins | remove the `!important` |
| Two variants of one component set the same property | first rendered wins | later declared wins | reorder them, or use a compound variant |
| Two breakpoints of one variant, rendered in different orders | first rendered wins | later one in `config.media` wins | none, this is the point |
| Two different variants, one responsive | responsive one wins | later-declared one wins | reorder if the responsive one should win |
| One style object reused at different depths | first rendered wins | deeper wins | none |
| Extension adds a default to a variant the base declared, base value used responsively | responsive value wins | responsive value wins | none |
| A `css()` class passed via `className` to override a variant | variant wins | variant still wins | use the `css` prop, or extend the component |

### Suggested order

1. Turn on `cascade: 'declared'` in a preview environment.
2. Audit the real output. Capture the app once per mode, then compare:

   ```bash
   tsx docs/bench/cascade-capture.mts legacy /tmp/audit http://localhost:5173 button box dialog
   tsx docs/bench/cascade-capture.mts declared /tmp/audit http://localhost:5173 button box dialog
   tsx docs/bench/cascade-audit.mts /tmp/audit/legacy.css /tmp/audit/declared.css /tmp/audit/declared.html
   ```

   The capture visits each route in a single page load, so the sheet accumulates the way it
   does for a real user. Do not capture after a full page load per route: a reload discards
   the sheet, leaving only the last route's rules, and the audit then compares almost
   nothing. If you already have SSR output, `getCssText()` per mode plus the markup works
   just as well.

   The audit resolves the winning declaration per element, viewport, selector suffix and
   property in both sheets and prints only the differences. Viewports are derived from every
   `min-width` and `max-width` in the sheets, so two breakpoints really do compete. It exits
   non-zero when anything differs, so it can gate the switch in CI. This turns "something
   might change" into a finite list per app.

   Two things to check before trusting a clean result: that the sheets contain about as many
   class rules as the markup has stitches classes (otherwise the capture missed routes), and
   that the two sheets differ in rule order at all (otherwise both captures ran in the same
   mode). The capture prints its rule count for the first; `diff` the ordered selector lists
   for the second.
3. Fix what it lists. Most entries are a variant reorder or an `!important` removal.
4. Run the visual regression suite, if there is one.
5. Grep your styles for `!important`. Most were added for the first row of the table and
   can go once the mode is on. Leave them during the migration and remove them after the
   audit is clean.

## What does not change

Class names are identical in both modes. A style object used at depth 0 in one component
and depth 1 in another produces the same class name; only which copy applies changes.
Warm renders are unaffected; ordering costs one binary search per newly injected rule.
