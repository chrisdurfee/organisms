# Base Atoms

**Version**: 1.0.0

## Overview
This documentation aims to guide the enhancement of component scalability and reusability within your projects through the use of organisms. Organisms are designed to function as the medium building blocks in a component-based architecture.

This module will add default organisms to your project.

## Atom Scope
Within our component model, each component autonomously generates its own scope. When components are nested, unique scopes are established at each level. Atoms inherit the scope of their parent component, gaining access to the component's state and data, and enabling directive manipulation and event handling.Organization of atoms is crucial for maintaining a clean and manageable codebase.

### Collection of Atoms
Organisms can be composed of various atoms and reused across different components. This promotes a modular approach to building user interfaces.

## Atom Types
Organisms can be instantiated using various methodologies:

### Function Oragnisms
These atoms are instantiated with either standard functions or arrow functions, equipped with a props object to transfer properties to the atoms.

```typescript
const Link = Atom((props, children) => (
    A({...props }, [
        Icon({ class: 'icon' }),
        children
    ])
));
```

### Atom Callbacks
Atoms may be created using the Atom function, which accepts a callback function as its sole parameter. The callback function is passed a props object and children array and returns an object containing the atom's layout.

```typescript
const Button = Atom((props, children) => ({
    tag: 'button',
    ...props,
    children
}));
```

#### Atom Nesting
Atoms should use composition to nest other atoms. This is achieved by passing the children array to the atoms args.

```typescript
const SecondaryButton = Atom((props, children) => (Button({
    ...props,
    class: 'secondary-btn',
    children
}));
```

## Adding Event Listeners
Event listener callbacks within atoms accept two parameters: the originating event object and the "parent" component object in which the atom resides.

### Accessing the Parent Component in an Atom
```typescript
class Page extends Component
{
    render()
    {
        return Div([
            SecondaryButton({
                /**
                 * This will add a click event listener to the button.
                 *
                 * @param {Event} event The event object
                 * @param {Component} parent The parent component object
                 * @returns {void}
                 */
                click(event, parent) =>
                {
                    // Code to access the parent component
                }
            })
        ]);
    }
}
```

## Utilization of Atoms
To leverage an atom, invoke its function and pass the requisite values via a props and children. The Atoms created with the Atom callback functions support passing optional props or children to the atom. The props object should always be first but if the atom does not require props, the children array or string can be passed as the first argument.

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

The implementation of atoms is aimed at enhancing the readability and modularity of extensive layouts.

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

## Contributing

Contributions to Base Framework are welcome. Follow these steps to contribute:

- Fork the repository.
- Create a new branch for your feature or bug fix.
- Commit your changes with clear, descriptive messages.
- Push your branch and submit a pull request.
- Before contributing, read our CONTRIBUTING.md for coding standards and community guidelines.

## License

Base Atoms are licensed under the MIT License. See the LICENSE file for details.
