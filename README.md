# Base Organisms

**Version**: 1.0.0

## Overview
This documentation aims to guide the enhancement of component scalability and reusability within your projects through the use of organisms. Organisms are designed to function as the medium building blocks in a component-based architecture.

This module will add default organisms to your project.

## Atom Scope
If you need to learn about atomic design, please refer to the [Atomic Design](https://bradfrost.com/blog/post/atomic-web-design/) documentation.

To learn more about Base framework or how to build atoms, refer to the [Base](https://github.com/chrisdurfee/base/wiki) documentation.

### Collection of Organisms
Organisms can be composed of various atoms and reused across different components. This promotes a modular approach to building user interfaces.

## Organism Types
Organisms can be instantiated using various methodologies:

### Oragnism Structure
Organisms can be created using atoms and components. Atoms are the smallest building blocks of a component, while components are composed of atoms and other components. Organisms are a collection of atoms and components that form a larger structure.

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

The implementation of both atoms and organisms is aimed at enhancing the readability and modularity of extensive layouts.

### Illustrative Example of a Complex Layout
```typescript
Section([
    Article({ class: 'post' }, [
        Header([
            H1('Title')
        ])
    ])
])
```
