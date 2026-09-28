/**
 * Global test setup.
 *
 * jsdom does not implement scrolling and logs a "Not implemented" error
 * through its virtual console every time it is called. The scroll
 * containers call `window.scrollTo` when restoring positions, so it is
 * stubbed here to keep the reporter output readable.
 */
window.scrollTo = () => {};
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || function() {};
