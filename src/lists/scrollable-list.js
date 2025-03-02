import { Div } from "@base-framework/atoms";
import { Atom } from "@base-framework/base";
import { List } from "./list.js";
import { PaginationTracker } from "./pagination-tracker.js";

/**
 * Get scroll metrics for a container.
 *
 * @param {HTMLElement|Window} container
 * @returns {object} Contains scrollTop, clientHeight, and scrollHeight.
 */
function getScrollMetrics(container)
{
	// @ts-ignore
	const scrollTop = container === window ? window.pageYOffset : container.scrollTop;
	// @ts-ignore
	const clientHeight = container === window ? window.innerHeight : container.clientHeight;
	// @ts-ignore
	const scrollHeight = container === window ? document.documentElement.scrollHeight : container.scrollHeight;
	return { scrollTop, clientHeight, scrollHeight };
}

/**
 * Check if the scroll position indicates we should load more items.
 *
 * @param {object} metrics - The scroll metrics.
 * @param {number} [threshold=100] - The threshold in pixels.
 * @returns {boolean}
 */
function shouldLoadMore(metrics, threshold = 100)
{
	return metrics.scrollTop + metrics.clientHeight >= metrics.scrollHeight - threshold;
}

/**
 * Check if more items can be loaded based on metrics and tracker state.
 *
 * @param {object} metrics - The scroll metrics.
 * @param {PaginationTracker} tracker - The pagination tracker.
 * @returns {boolean}
 */
const canLoad = (metrics, tracker) =>
{
	const MAX = 100;
	return shouldLoadMore(metrics, MAX) && tracker.canLoadMore();
};

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
const ScrollableList = Atom((props) =>
{
	// Create a pagination tracker instance.
	const tracker = new PaginationTracker(props.offset, props.limit);

	// Scroll event handler.
	const handleScroll = (e, { list }) =>
	{
		const metrics = getScrollMetrics(e.target);
		if (canLoad(metrics, tracker))
		{
			props.loadMoreItems(tracker.currentOffset, tracker.limit, (rows) =>
			{
				if (rows && rows.length > 0)
				{
					list.append(rows);
					tracker.update(rows.length);
				}
				else
				{
					tracker.hasMoreData = false;
				}
			});
		}
	};

	// Determine the container for scroll events (defaults to window).
	const container = props.scrollContainer || window;

	return Div(
		{
			class: props.containerClass ?? '',
			addEvent: ['scroll', container, handleScroll, { passive: true }],
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
	);
});

export default ScrollableList;