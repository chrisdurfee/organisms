import { Div } from "@base-framework/atoms";
import { Atom } from "@base-framework/base";
import { PaginationTracker } from "./pagination-tracker.js";

// Module-level constant for scroll threshold.
const SCROLL_THRESHOLD = 100;

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
 * @param {number} [threshold=SCROLL_THRESHOLD] - The threshold in pixels.
 * @returns {boolean}
 */
function shouldLoadMore(metrics, threshold = SCROLL_THRESHOLD)
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
	return shouldLoadMore(metrics) && tracker.canLoadMore();
};

/**
 * Update the rows in the list and the tracker state.
 *
 * @param {Array} rows
 * @param {PaginationTracker} tracker
 * @param {object} list
 */
const updateRows = (rows, tracker, list) =>
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
};

/**
 * Set up a fetch callback for loading data.
 *
 * @param {object} data
 * @returns {function}
 */
const setupFetchCallback = (data) =>
{
	return (offset, limit, callBack) =>
	{
		data.xhr.all('', (response) =>
		{
			const rows = response.rows || response.items || [];
			callBack(rows);
		});
	};
};

/**
 * A ScrollableList component that updates when its container is scrolled.
 *
 * @param {object} props
 * @property {HTMLElement} [props.scrollContainer] - The container element for scroll events. Defaults to window.
 * @property {function} [props.loadMoreItems] - A function to fetch/generate additional items.
 * @property {object} [props.data] - The data object containing the xhr method.
 * @property {number} [props.offset] - The initial offset. Defaults to 0.
 * @property {number} [props.limit] - Number of items to load per batch. Defaults to 20.
 * @property {string} [props.containerClass] - The class to add to the scroll container.
 * @param {array} children - The child elements to render.
 * @returns {object}
 */
export const ScrollableContainer = Atom((props, children) =>
{
	const tracker = new PaginationTracker(props.offset, props.limit);
	const container = props.scrollContainer || window;
	const fetchCallback = props.loadMoreItems || setupFetchCallback(props.data);

	/**
	 * This will handle the scroll event.
	 *
	 * @param {object|null} e
	 * @param {object} parent
	 * @returns {void}
	 */
	const handleScroll = (e, { list }) =>
	{
		const metrics = getScrollMetrics(container);
		if (canLoad(metrics, tracker))
		{
			fetchCallback(tracker.currentOffset, tracker.limit, (rows) =>
			{
				updateRows(rows, tracker, list);
			});
		}
	};

	return Div(
		{
			class: props.containerClass ?? '',

			/**
			 * This will request to update the list when the atom is created.
			 *
			 * @param {object} ele
			 * @param {object} parent
			 * @returns {void}
			 */
			onCreated(ele, { list })
			{
				handleScroll(null, { list });
			},

			/**
			 * This will add the scroll event to the container.
			 */
			addEvent: ['scroll', container, handleScroll, { passive: true }],
		},
		children
	);
});

export default ScrollableContainer;