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
	// @ts-ignore
	const cache = props.cache ?? 'list';
	return BiDirectionalContainer(
		{
			listCache: cache,
			// @ts-ignore
			scrollDirection: props.scrollDirection || 'down',
			// @ts-ignore
			scrollContainer: props.scrollContainer,
			// @ts-ignore
			loadMoreItems: props.loadMoreItems,
			// @ts-ignore
			offset: props.offset,
			// @ts-ignore
			limit: props.limit,
			// @ts-ignore
			containerClass: props.containerClass ?? 'flex flex-auto flex-col',
			// @ts-ignore
			data: props.data
		},
		[
			new List({
				cache,
				// @ts-ignore
				key: props.key,
				// @ts-ignore
				items: props.items || [],
				// @ts-ignore
				divider: props.divider,
				role: 'list',
				// @ts-ignore
				class: props.class,
				// @ts-ignore
				emptyState: props.emptyState || null,
				// @ts-ignore
				rowItem: props.rowItem,
				// @ts-ignore
				linkParent: props.linkParent ?? false,
				isDynamic: true
			})
		]
	);
});

export default ScrollableList;