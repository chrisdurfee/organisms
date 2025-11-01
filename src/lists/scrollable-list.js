import { Atom } from "@base-framework/base";
import BiDirectionalContainer from "./bi-directional-container.js";
import { List } from "./list.js";

/**
 * A ScrollableList component that updates when its container is scrolled.
 *
 * @param {object} props
 * @property {HTMLElement} [props.scrollContainer] - The container element for scroll events. Defaults to globalThis.
 * @property {function} [props.loadMoreItems] - A function to fetch/generate additional items.
 * @property {number} [props.offset] - The initial offset. Defaults to 0.
 * @property {number} [props.limit] - Number of items to load per batch. Defaults to 20.
 * @property {string} [props.class] - The class to add to the list.
 * @property {string} [props.key] - The key to use to identify the items.
 * @property {array} [props.items] - The initial items.
 * @property {object} [props.divider] - The row divider.
 * @property {function} [props.rowItem] - The row item.
 * @property {object} [props.data] - The data object containing the xhr method.
 * @property {string} [props.containerClass] - The class to add to the scroll container.
 * @property {object|null} [props.emptyState] - The empty state to show when there are no items.
 * @property {string} [props.cache] - The cache name to use.
 * @property {boolean} [props.linkParent] - Whether to link the parent data.
 * @returns {object}
 */
export const ScrollableList = Atom((props) =>
{
	const cache = props.cache ?? 'list';
	return BiDirectionalContainer(
		{
			listCache: cache,
			scrollDirection: props.scrollDirection || 'down',
			scrollContainer: props.scrollContainer,
			loadMoreItems: props.loadMoreItems,
			offset: props.offset,
			limit: props.limit,
			containerClass: props.containerClass ?? 'flex flex-auto flex-col',
			data: props.data
		},
		[
			new List({
				cache,
				key: props.key,
				items: props.items || [],
				divider: props.divider,
				role: 'list',
				class: props.class,
				emptyState: props.emptyState || null,
				rowItem: props.rowItem,
				linkParent: props.linkParent ?? false,
				isDynamic: true
			})
		]
	);
});

export default ScrollableList;