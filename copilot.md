# Base Framework Organisms - AI Coding Instructions

## Project Architecture

This is a **Base Framework** organisms library that provides reusable UI components following **Atomic Design** principles. Components are built using the Base framework's `Atom`, `Component`, and `Jot` patterns.

### Key Dependencies
- `@base-framework/base` - Core framework (Component, Data, Jot, router)
- `@base-framework/atoms` - Basic HTML atoms (Div, Span, Tbody, etc.)

### Build System
- **Primary**: ESBuild (`node ./esbuild.js`) - bundles to `dist/organisms.js`
- **Types**: TypeScript compiler generates `.d.ts` files from JSDoc comments
- **Format**: ES modules with external dependencies
- Run `npm run build` for both bundling and type generation

## Component Patterns

### 1. Atom Functions (Functional Components)
Use `Atom()` for simple, stateless organisms that compose other atoms:

```javascript
export const DataList = Atom((props) => (
    DataContainer(
        { loadMoreItems: props.loadMoreItems, data: props.data },
        [new List({ key: props.key, items: props.items || [] })]
    )
));
```

### 2. Component Classes (Stateful)
Use `Component` class for complex organisms with lifecycle methods:

```javascript
export class NavLink extends Component {
    beforeSetup() { /* setup logic */ }
    render() { return { tag: 'a', /* config */ }; }
    setupStates() { return { selected: false }; }
}
```

### 3. Jot Components (Reactive)
Use `Jot()` for data-driven components with reactive state:

```javascript
export const List = Jot({
    setData() { return new Data({ items, hasItems: null }); },
    render() { return Div({ for: ['items', this.row.bind(this)] }); }
});
```

## Critical Conventions

### Data Binding & Reactivity
- Use `Data` objects for reactive state management
- Link parent/child data: `this.data.link(parentData, 'hasItems')`
- Use `On()` for conditional rendering: `On('hasItems', (hasItems) => ...)`
- Use `for` property for array iteration: `for: ['items', rowCallBack]`

### Component Communication
- **Parent-to-child**: Pass data via props and context
- **Data linking**: Components can link to parent data objects
- **State watchers**: Use `watch` property for reactive updates

### File Structure
- Export both named and default: `export const List = ...; export default List;`
- Use relative imports from `src/`: `import { ChildHelper } from 'src/utils/child-helper.js';`
- Group by domain: `lists/`, `tables/`, `router/`, `time/`, `utils/`

### TypeScript Integration
- Use JSDoc comments for type definitions
- Include comprehensive `@param` documentation
- Mark class properties with `@member` tags
- Use `// @ts-ignore` sparingly for Base framework patterns

## Data Management Patterns

### Pagination & Scrolling
- Use `PaginationTracker` for offset/limit tracking
- Implement `loadMoreItems` functions for data fetching
- Use `ScrollableContainer` for infinite scroll behavior

### Caching
- Set `cache` properties on components for DOM caching
- Use meaningful cache keys: `cache: 'listContainer'`

## Component Lifecycle

### Setup Order
1. `declareProps()` - declare component properties
2. `onCreated()` - post-creation setup
3. `before()` - pre-render setup (data linking)
4. `setData()` - initialize reactive data
5. `render()` - return component structure

### Cleanup
- Implement `destroy()` method to reset data states
- Clean up timers and intervals in components

## Testing & Development

- **Build**: `npm run build` (ESBuild + TypeScript)
- **Entry point**: `src/organisms.js` exports all public components
- **External deps**: Base framework components are externalized in build
- **Types**: Generated in `dist/types/` from JSDoc annotations

## Common Anti-Patterns

❌ Don't use direct DOM manipulation - use Base framework atoms
❌ Don't create Components for simple compositions - use Atoms
❌ Don't forget to export both named and default exports
❌ Don't mix Component lifecycle with functional patterns
❌ Don't ignore parent data linking in nested components