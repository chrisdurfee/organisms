import { PaginationTracker } from "./pagination-tracker.js";

// Module-level constant for scroll threshold.
const SCROLL_THRESHOLD = 100;

/**
 * Get scroll metrics for a container.
 *
 * @param {HTMLElement|Window} container
 * @returns {object} Contains scrollTop, clientHeight, and scrollHeight.
 */
export function getScrollMetrics(container)
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
export function shouldLoadMore(metrics, threshold = SCROLL_THRESHOLD)
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
export const canLoad = (metrics, tracker) =>
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
export const updateRows = (rows, tracker, list) =>
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
export const setupFetchCallback = (data) =>
{
	return (offset, limit, callback) =>
	{
		data.xhr.all('', (response) =>
		{
			let rows = [];

			if (response)
			{
				rows = response.rows || response.items || [];
			}

			callback(rows);
		}, offset, limit);
	};
};

/**
 * Create a scroll event handler for the container.
 *
 * @param {object} container
 * @param {PaginationTracker} tracker
 * @param {function} fetchCallback
 * @returns {function} A scroll event handler function.
 */
export const createScrollHandler = (container, tracker, fetchCallback) =>
{
	/**
	 * This will handle the scroll event.
	 *
	 * @param {object|null} e
	 * @param {object} parent
	 * @returns {void}
	 */
	return (e, { list }) =>
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
};

/**
 * Create a table scroll event handler for the container.
 *
 * @param {object} container
 * @param {PaginationTracker} tracker
 * @param {function} fetchCallback
 * @returns {function} A scroll event handler function.
 */
export const createTableScrollHandler = (container, tracker, fetchCallback) =>
{
	/**
	 * This will handle the scroll event.
	 *
	 * @param {object|null} e
	 * @param {object} list
	 * @returns {void}
	 */
	return (e, list) =>
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
};