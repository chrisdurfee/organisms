import { Atom } from "@base-framework/base";
import { DynamicContainer } from "./dynamic-container.js";
import { List } from "./list.js";

/**
 * A DynamicList component that updates the data by fetching more items.
 *
 * @param {Record.<string, any>} props
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
 * @property {object|null} [props.emptyState] - The empty state to show when there are no items.
 * @property {boolean} [props.linkParent] - Whether to link the parent data.
 * @property {string} [props.cache] - The cache name to use.
 * @property {object} [props.skeleton] - Skeleton loader config `{ number, row }` shown before data loads.
 * @property {string} [props.minHeight] - A CSS min-height reserved while the first page loads
 *   (no skeleton) so content does not pop in. Off by default.
 * @property {number} [props.revalidateLimit] - The most resumed rows one revalidation request
 *   covers when a persisted list resumes. Defaults to max(limit, 50).
 * @property {boolean} [props.clone=true] - Deep-copies every batch of items (the default). Pass
 *   `false` to use the item objects as given and keep one copy of the data in memory; the
 *   caller must not mutate them afterwards.
 * @property {boolean} [props.contentVisibility=false] - Applies `content-visibility:auto` to each
 *   row so the browser skips rendering off-screen rows.
 * @property {number} [props.rowHeight=64] - The estimated row height (px) reserved for an
 *   unrendered row when `contentVisibility` is on.
 * @property {number} [props.maxRows] - Caps the rows kept in the list: rows added at one end
 *   drop the oldest rows at the other end. Dropped rows are not re-fetched. Unlimited by default.
 * @returns {object}
 */
export const DynamicList = Atom((props) =>
{
	// @ts-ignore
	const cache = props.cache ?? 'list';

	/**
	 * Persist inheritance requires an explicit `cache` name: the persist
	 * token is derived from the cache, so lists on the default 'list'
	 * slot would collide on one token and resume each other's scope.
	 * Cacheless lists only persist when explicitly asked.
	 */
	// @ts-ignore
	const persist = props.persist ?? (props.cache ? null : false);

	return DynamicContainer(
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
			revalidateLimit: props.revalidateLimit,
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
				limit: props.limit,
				// @ts-ignore
				minHeight: props.minHeight,
				// @ts-ignore
				clone: props.clone,
				// @ts-ignore
				contentVisibility: props.contentVisibility,
				// @ts-ignore
				rowHeight: props.rowHeight,
				// @ts-ignore
				maxRows: props.maxRows,
				// @ts-ignore
				rowItem: props.rowItem,
				// @ts-ignore
				linkParent: props.linkParent ?? false,
				persist,
				isDynamic: true
			})
		]
	);
});

export default DynamicList;