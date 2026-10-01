import { styledElement as _styledElement, useStitchesEnvironment } from "/Users/durge/dev/stitches/packages/native/src/react/index.ts";
import * as React from 'react';
import { createStitches } from "/Users/durge/dev/stitches/packages/native/src/react/index.ts";
export const {
  styled,
  Provider,
  createTheme,
  theme
} = createStitches({
  theme: {
    colors: {
      text: 'black'
    }
  },
  media: {
    md: '(min-width: 600px)'
  }
});
const View = props => React.createElement('View', props);
export const Card = styled(View, {
  color: '$text',
  padding: 1,
  '@md': {
    padding: 2
  },
  variants: {
    size: {
      l: {
        padding: 3
      }
    }
  }
});
export const Plain = styled(View, {
  margin: 1
});

// The screen returns its styled elements (an array, so no JSX remains for a JSX transform to do).
function Screen({
  items
}) {
  const _stitches = useStitchesEnvironment();
  return [items.map(item => _styledElement(Card, {
    size: item === 'b' ? 'l' : undefined,
    testID: item
  }, item, _stitches, item)), _styledElement(Plain, {
    testID: "plain"
  }, "plain", _stitches)];
}
export function App({
  items,
  width,
  activeTheme
}) {
  return React.createElement(Provider, {
    viewport: {
      width,
      height: 800
    },
    theme: activeTheme
  }, React.createElement(Screen, {
    items
  }));
}

/** The same tree, uncompiled: what JSX would have made without the plugin. */
function ReferenceScreen({
  items
}) {
  return [items.map(item => React.createElement(Card, {
    key: item,
    size: item === 'b' ? 'l' : undefined,
    testID: item
  }, item)), React.createElement(Plain, {
    key: 'plain',
    testID: 'plain'
  })];
}
export function Reference({
  items,
  width,
  activeTheme
}) {
  return React.createElement(Provider, {
    viewport: {
      width,
      height: 800
    },
    theme: activeTheme
  }, React.createElement(ReferenceScreen, {
    items
  }));
}