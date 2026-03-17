import { Atom } from "@base-framework/base";
import DataContainer from "./data-container.js";
import { List } from "./list.js";

/**
 * A ScrollableList component that updates when its container is scrolled.
 *
 * @param {object} props
 * @property {function} [props.loadMoreItems] - A function to fetch/generate additional items.
 * @property {number} [props.offset] - The initial offset. Defaults to 0.
 * @property {number} [props.limit] - Number of items to load per batch. Defaults to 20.
 * @property {string} [props.class] - The class to add to the list.
 * @property {string} [props.key] - The key to use to identify the items.
 * @property {array} [props.items] - The initial items.
 * @property {object} [props.divider] - The row divider.
 * @property {function} [props.rowItem] - The row item.
 * @property {object} [props.data] - The data object containing the xhr method.
 * @property {string} [props.xhrMethod='all'] - The method name to call on data.xhr.
 * @property {string} [props.containerClass] - The class to add to the scroll container.
 * @property {string} [props.cache] - The cache name to use.
 * @property {object|null} [props.emptyState] - The empty state to show when there are no items.
 * @property {object} [props.skeleton] - Skeleton loader config `{ number, row }` shown before data loads.
 * @returns {object}
 */
export const DataList = Atom((props) =>
{
	// @ts-ignore
	const cache = props.cache ?? 'list';
	return DataContainer(
		{
			listCache: cache,
			// @ts-ignore
			loadMoreItems: props.loadMoreItems,
			// @ts-ignore
			xhrMethod: props.xhrMethod,
			// @ts-ignore
			offset: props.offset,
			// @ts-ignore
			limit: props.limit,
			// @ts-ignore
			containerClass: props.containerClass ?? '',
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
				skeleton: props.skeleton || null,
				// @ts-ignore
				linkParent: props.linkParent || false,
				// @ts-ignore
				rowItem: props.rowItem
			})
		]
	);
});

export default DataList;