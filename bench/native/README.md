# React Native benchmark app

Measures what styling with `@stitches/native` costs in a real React Native app (Hermes, Fabric,
Release build), next to no styling at all and plain `StyleSheet`. The JS-only benchmarks in
`docs/bench` time the styling code; this one answers how much of an update the user waits for is
styling at all.

It is not part of the yarn workspaces and has its own `package.json`, so Expo and React Native
never reach the packages' dependency tree.

## What it measures

400 cards, each a styled `View` with a title and a subtitle `Text`, with `size` and `tone`
variants. The same list is written five ways:

| Name         | How a card is styled                                           |
| ------------ | -------------------------------------------------------------- |
| `none`       | no style at all: the floor everything else is compared to      |
| `stylesheet` | `StyleSheet.create` per theme, the hand-written baseline       |
| `styled`     | `styled(View, …)` components                                   |
| `useStyle`   | `css` objects resolved with `useStyle` in the card             |
| `compiled`   | the same JSX as `styled`, compiled by `@stitches/native-babel` |

Each is timed for three operations, from the state change:

- **mount**: the list appears;
- **update**: a new generation of items, where a third of the cards change size and a fifth tone,
  and unchanged items keep their object (as immutable app state does);
- **theme**: switching between the light and the dark theme.

Two numbers per operation: **commit**, until React has committed (on Fabric this includes building
the native shadow tree on the JavaScript thread), and **frame**, until the next frame after that.

Each scenario runs in its own launch of the app, twice (the second pass in reverse order), with a
warm-up round and ten measured rounds per launch. Separate launches matter: the scenarios render
the same text, and when they shared a process, whichever measured that text first paid for the
others. The report gives the median with its interquartile range, and the difference to
`StyleSheet` and to no styling.

The difference to `StyleSheet` is what stitches costs. The difference to no styling is larger and
mostly not about how styles are written: a styled card that changes size has to be laid out and
its text measured again, which an unstyled one does not.

The whole run happens twice, with React Compiler off and on (`experiments.reactCompiler`, which
`babel-preset-expo` applies), because the compiler skips unchanged cards entirely and so changes
what styling costs on update.

## Running it

macOS with Xcode and an iOS simulator. From the repo root:

```bash
yarn build
```

```bash
cd bench/native && node run.mjs
```

`run.mjs` copies the built `packages/native` and `packages/native-babel` into the app, installs,
writes the iOS project with `expo prebuild`, builds it in Release with `xcodebuild`, installs and
launches it with `simctl`, and prints a table per mode. It needs no Simulator window, so it runs
over SSH. Raw results land in `results/<mode>.json`.

| Variable    | Default         |                                                                            |
| ----------- | --------------- | -------------------------------------------------------------------------- |
| `MODES`     | `off,on`        | React Compiler modes to run.                                               |
| `IOS`       | any             | Only simulators of this iOS version, e.g. `26`.                            |
| `SIMULATOR` | the last iPhone | A simulator by name or UDID.                                               |
| `MICRO`     | unset           | Time the pieces of one styled element on Hermes, instead of the scenarios. |

The app uses Expo SDK 57 (React Native 0.86). iOS 27 stops any app at launch that has not adopted
the scene life cycle, and SDK 57's iOS template has not; the first SDK whose template has is 58. So
run it on an iOS 26 simulator (`IOS=26`). If Xcode has only the iOS 27 runtime, add 26 with
`xcodebuild -downloadPlatform iOS -buildVersion 26.0`.

Only the `compiled` list goes through the Babel plugin: `src/compiled.js` imports the cards as
`./cards.js` and every other file as `./cards`, and `babel.config.js` lists only the former in the
plugin's `sources`. A per-file `overrides` entry would be clearer, but Metro loads the Babel config
once without a filename, which Babel rejects for a filename test.

## Results

Mac mini (M4), iPhone 17 simulator on iOS 26.0, Release, `@stitches/native` from `next` as of
2026-10-01. Commit time in milliseconds, median of 20 samples; in brackets the difference to
`StyleSheet`.

| React Compiler off | mount       | update      | theme       |
| ------------------ | ----------- | ----------- | ----------- |
| no styling         | 14.8        | 7.9         | 7.3         |
| `StyleSheet`       | 21.0        | 23.5        | 27.1        |
| `useStyle`         | 21.1 (+0.1) | 25.2 (+1.7) | 28.4 (+1.3) |
| `styled`           | 25.3 (+4.3) | 26.4 (+2.9) | 29.9 (+2.8) |
| compiled           | 24.8 (+3.8) | 28.1 (+4.6) | 32.4 (+5.4) |

| React Compiler on | mount       | update      | theme       |
| ----------------- | ----------- | ----------- | ----------- |
| no styling        | 14.6        | 1.5         | 1.7         |
| `StyleSheet`      | 22.4        | 22.0        | 27.3        |
| `useStyle`        | 21.6 (−0.9) | 22.1 (+0.1) | 29.5 (+2.2) |
| `styled`          | 25.5 (+3.0) | 23.8 (+1.8) | 33.2 (+5.9) |
| compiled          | 25.5 (+3.0) | 24.4 (+2.4) | 32.2 (+4.8) |

Split into React's render phase (on Fabric this includes creating each element's native node) and
the rest of the commit (the shadow tree diff and layout), React Compiler off:

| ms           | render: mount | update | theme | native: mount | update | theme |
| ------------ | ------------- | ------ | ----- | ------------- | ------ | ----- |
| no styling   | 11.5          | 7.7    | 7.2   | 3.2           | 0.0    | 0.0   |
| `StyleSheet` | 16.6          | 12.6   | 15.9  | 3.7           | 11.7   | 12.3  |
| `useStyle`   | 17.4          | 14.1   | 17.0  | 3.7           | 11.6   | 12.3  |
| `styled`     | 21.2          | 15.9   | 18.7  | 3.9           | 11.3   | 12.4  |
| compiled     | 20.9          | 17.2   | 21.3  | 4.0           | 11.2   | 12.6  |

What this says:

- Styling at all is the large cost: laying out cards that change size and measuring their text
  again. `StyleSheet` costs 6 to 8 ms over no styling on mount and 16 to 26 ms on an update or theme
  switch, where an unstyled list does almost nothing.
- Stitches adds nothing to the native side: the native part of the commit is the same for every way
  of styling. Everything it costs is in the render phase.
- `useStyle` is within 1 to 1.5 ms of `StyleSheet`. `styled` and compiled elements cost 3 to 5 ms more
  per 400 cards (1200 styled elements). Each scenario's two launches agree to within about 1 ms, so
  these differences are consistent, although the interquartile ranges are wide: rounds alternate
  between generations and themes, which differ systematically.
- Compiling with `@stitches/native-babel` does not beat `styled`, and is about 1.5 ms slower on update
  and theme switch, although it wins the JS-only benchmark.
- On Hermes, `MICRO=1` times the pieces of one element outside React: the style lookup is about 330
  ns, the props split about 190 ns, and `styledElement` about 0.5 µs more than a lookup plus
  `createElement` (the `useStyle` shape). That accounts for about 0.6 ms of the 3 to 5 ms; where
  the rest goes inside a real render is not yet known.
- React Compiler removes the floor (an unchanged card is skipped), but not the styling cost: half
  the cards change on every update, and those are laid out again whichever way they are styled.
