# Base Organisms

**Version**: 1.1.63

## Overview
This documentation aims to guide the enhancement of component scalability and reusability within your projects through the use of organisms. Organisms are designed to function as the medium building blocks in a component-based architecture.

This module will add default organisms to your project.

## Atomic Design
If you need to learn about atomic design, please refer to the [Atomic Design](https://bradfrost.com/blog/post/atomic-web-design/) documentation.

To learn more about Base framework or how to build atoms, refer to the [Base](https://github.com/chrisdurfee/base/wiki) documentation.

### Oragnism Structure
Organisms can be created using atoms, other organisms, and components. Atoms are the smallest building blocks of a component, while components are composed of atoms and other components. Organisms are a collection of atoms and components that form a larger structure.

```typescript
// Atom
const Link = Atom((props, children) => ({
    ...props,
    children,
    tag: 'a',
}));

// Organism Atom
const Link = Atom((props, children) => (
    Link({...props }, [
        Icon({ class: 'icon' }),
        children
    ])
));

// Organism Atom with Component
const Link = Atom((props, children) => (
    Nav([
        Ul([
            Li([
                Link([
                    Icon({ class: 'icon' }),
                    Span('Text')
                ])
            ])
        ])
    ]),
    new List({...props }, [
        children
    ])
));

// Organism Function with Component
const List = (props, children) => Div([
    Header([
        H1('Title')
    ]),
    new List({...props }, [
        children
    ])
]);
```

#### Organisms Nesting
Organisms should use composition to nest other atoms, organisms, or components.

```typescript
const SecondaryButton = Atom((props, children) => (Button({
    ...props,
    class: 'secondary-btn',
    children
}));
```

## Utilization of Organisms
To leverage an organism, invoke its function and pass the requisite values via a props and children. The organisms created with the Atom callback functions support passing optional props or children to the atom. The props object should always be first but if the atom does not require props, the children array or string can be passed as the first argument.

```javascript
// props only
Div({class: 'text'});

// text child only
Div('test');

// array child only
Div([
    Div('test')
]);

// props and text child
Div({class: 'text'}, 'test');

// props and array children
Div({class: 'text'}, [
    Div('test'),
    Div('test')
]);
```

### Example of Atom Utilization
```typescript
SecondaryButton({
    click(e) =>
    {
        // Handle the click event
    }
})
```

## Features

### Bi-Directional Pagination

The library includes advanced bi-directional pagination support for building real-time interfaces:

- **Dual Scroll Directions**: Support for both feed-style (scroll down) and chat-style (scroll up) interfaces
- **Cursor-based Pagination**: Efficient loading of older items using keyset pagination
- **Since-based Forward Pagination**: Load newer items using timestamp or ID-based queries
- **External Polling Control**: Flexible architecture allowing parent components to control update timing
- **Optimized for Real-time**: Designed for chat, messaging, activity feeds, and social media timelines

#### Scroll Directions

- **`scrollDirection: 'down'`** (default): For feeds/timelines - scroll down for older items, new items appear at top
- **`scrollDirection: 'up'`**: For chat/messaging - scroll up for older items, new messages appear at bottom

For usage examples, see the JSDoc in [bi-directional-container.js](./src/lists/bi-directional-container.js).

### Large Lists and Memory

All of these are off (or unchanged) by default:

- **`clone: false`** (List, DataList, ScrollableList, DynamicList, table bodies): use the item objects as given instead of deep-copying every batch, so the data is kept in memory once. The caller must not mutate those objects afterwards. `setRows()` never copies, whatever `clone` is set to.
- **`maxRows`** (ScrollableList, BiDirectionalContainer): keep at most about `maxRows` rows. Whole pages are dropped from the end opposite the loading edge and re-fetched when the user scrolls back; the scroll position is kept when rows above the viewport are removed. On DynamicList (and a plain List) the cap simply drops the oldest rows. Not applied to lists with a divider.
- **`contentVisibility: true`** with **`rowHeight`** (default 64): adds `content-visibility:auto; contain-intrinsic-size:auto <rowHeight>px` to each row so the browser skips rendering off-screen rows without changing the DOM.

## License
This project is licensed under the ISC License.
