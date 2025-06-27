import { PaginationTracker } from "./pagination-tracker.js";

// Module-level constant for scroll threshold (in pixels)
const SCROLL_THRESHOLD = 100;

/**
 * Get scroll metrics for a container.
 *
 * @param {HTMLElement|globalThis} container
 * @returns {object} Contains scrollTop, clientHeight, and scrollHeight.
 */
export function getScrollMetrics(container)
{
	// @ts-ignore
	const scrollTop = container === globalThis ? globalThis.pageYOffset : container.scrollTop;
	// @ts-ignore
	const clientHeight = container === globalThis ? globalThis.innerHeight : container.clientHeight;
	// @ts-ignore
	const scrollHeight = container === globalThis ? globalThis.document.documentElement.scrollHeight : container.scrollHeight;
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
 * Update the rows in the list and update the tracker state.
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
		/**
		 * This will handle the result of the fetch.
		 *
		 * @param {object|null} response
		 * @returns {void}
		 */
		const resultCallback = (response) =>
		{
			let rows = [];
			if (response)
			{
				rows = response.rows || response.items || [];
			}
			callback(rows);
		};

		data.xhr.all('', resultCallback, offset, limit);
	};
};

/**
 * Fetch and update rows in the list.
 *
 * @param {function} fetchCallback
 * @param {PaginationTracker} tracker
 * @param {object} list
 * @returns {void}
 */
export const fetchAndUpdate = (fetchCallback, tracker, list) =>
{
	fetchCallback(tracker.currentOffset, tracker.limit, (rows) =>
	{
		updateRows(rows, tracker, list);
	});
};

/**
 * Fetch and refresh the list.
 *
 * @param {function} fetchCallback
 * @param {PaginationTracker} tracker
 * @param {object} list
 * @returns {void}
 */
export const fetchAndRefresh = (fetchCallback, tracker, list) =>
{
	tracker.reset();
	fetchCallback(tracker.currentOffset, tracker.limit, (rows) =>
	{
		list.reset();
		updateRows(rows, tracker, list);
	});
};

/**
 * Create a scroll event handler for the container.
 *
 * This handler ensures that loading is triggered only when the user is close
 * to the bottom of the container and prevents multiple concurrent loads.
 *
 * @param {object} container - The scrollable container.
 * @param {PaginationTracker} tracker - The pagination tracker.
 * @param {function} fetchCallback - Function to fetch data.
 * @returns {function} A scroll event handler function.
 */
export const createScrollHandler = (container, tracker, fetchCallback) =>
{
	return (e, { list }, callBack) =>
	{
		const metrics = getScrollMetrics(container);
		if (canLoad(metrics, tracker))
		{
			// Prevent multiple concurrent loads
			if (tracker.loading)
			{
				return;
			}

			tracker.loading = true;
			fetchCallback(tracker.currentOffset, tracker.limit, (rows) =>
			{
				if (callBack)
				{
					callBack();
				}

				updateRows(rows, tracker, list);
				tracker.loading = false;
			});
		}
	};
};

/**
 * Create a table scroll event handler for the container.
 *
 * This handler ensures that loading is triggered only when the user is close
 * to the bottom of the container and prevents multiple concurrent loads.
 *
 * @param {object} container - The scrollable container.
 * @param {PaginationTracker} tracker - The pagination tracker.
 * @param {function} fetchCallback - Function to fetch data.
 * @returns {function} A scroll event handler function.
 */
export const createTableScrollHandler = (container, tracker, fetchCallback) =>
{
	return (e, list, callBack) =>
	{
		const metrics = getScrollMetrics(container);
		if (canLoad(metrics, tracker))
		{
			// Prevent multiple concurrent loads
			if (tracker.loading)
			{
				return;
			}

			tracker.loading = true;
			fetchCallback(tracker.currentOffset, tracker.limit, (rows) =>
			{
				if (callBack)
				{
					callBack();
				}

				updateRows(rows, tracker, list);
				tracker.loading = false;
			});
		}
	};
};
