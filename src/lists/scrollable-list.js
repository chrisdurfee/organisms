import { Atom } from "@base-framework/base";
import { List } from "./list.js";
import ScrollableContainer from "./scrollable-container.js";

/**
 * A ScrollableList component that updates when its container is scrolled.
 *
 * @param {object} props
 * @property {HTMLElement} [props.scrollContainer] - The container element for scroll events. Defaults to window.
 * @property {function} [props.loadMoreItems] - A function to fetch/generate additional items.
 * @property {number} [props.offset] - The initial offset. Defaults to 0.
 * @property {number} [props.limit] - Number of items to load per batch. Defaults to 20.
 * @property {string} [props.class] - The class to add to the list.
 * @property {string} [props.key] - The key to use to identify the items.
 * @property {array} [props.items] - The initial items.
 * @property {object} [props.divider] - The row divider.
 * @property {function} [props.rowItem] - The row item.
 * @property {string} [props.containerClass] - The class to add to the scroll container.
 * @returns {object}
 */
export const ScrollableList = Atom((props) => (
	ScrollableContainer(
		{
			scrollContainer: props.scrollContainer,
			loadMoreItems: props.loadMoreItems,
			offset: props.offset,
			limit: props.limit,
			containerClass: props.containerClass ?? ''
		},
		[
			new List({
				cache: 'list',
				key: props.key,
				items: props.items || [],
				divider: props.divider,
				role: 'list',
				class: props.class,
				rowItem: props.rowItem
			})
		]
	)
));

export default ScrollableList;