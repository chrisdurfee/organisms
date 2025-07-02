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
 * @property {string} [props.containerClass] - The class to add to the scroll container.
 * @property {string} [props.cache] - The cache name to use.
 * @returns {object}
 */
export const DataList = Atom((props) => (
	DataContainer(
		{
			loadMoreItems: props.loadMoreItems,
			offset: props.offset,
			limit: props.limit,
			containerClass: props.containerClass ?? '',
			data: props.data
		},
		[
			new List({
				cache: props.cache ?? 'list',
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

export default DataList;