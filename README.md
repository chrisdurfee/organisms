# Base Organisms

**Version**: 1.0.0

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

For detailed documentation, see:
- [SCROLL_DIRECTIONS.md](./docs/SCROLL_DIRECTIONS.md) - Complete scroll direction guide
- [BI_DIRECTIONAL_IMPLEMENTATION.md](./docs/BI_DIRECTIONAL_IMPLEMENTATION.md) - Implementation guide
- [Examples](./docs/examples/) - Working code examples

## License
This project is licensed under the MIT License.
