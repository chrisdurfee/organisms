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
 * Check if the scroll position indicates we should load more items at the bottom.
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
 * Check if the scroll position indicates we should load more items at the top.
 *
 * @param {object} metrics - The scroll metrics.
 * @param {number} [threshold=SCROLL_THRESHOLD] - The threshold in pixels.
 * @returns {boolean}
 */
export function shouldLoadAtTop(metrics, threshold = SCROLL_THRESHOLD)
{
	return metrics.scrollTop <= threshold;
}

/**
 * Check if more items can be loaded at the bottom based on metrics and tracker state.
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
 * Check if more items can be loaded at the top based on metrics and tracker state.
 *
 * @param {object} metrics - The scroll metrics.
 * @param {PaginationTracker} tracker - The pagination tracker.
 * @returns {boolean}
 */
export const canLoadAtTop = (metrics, tracker) =>
{
	return shouldLoadAtTop(metrics) && tracker.canLoadMore();
};

/**
 * Update the rows in the list by appending and update the tracker state.
 *
 * @param {Array} rows
 * @param {PaginationTracker} tracker
 * @param {object} list
 * @param {string|null} lastCursor - The last cursor value.
 * @returns {void}
 */
export const updateRows = (rows, tracker, list, lastCursor = null) =>
{
	if (rows && rows.length > 0)
	{
		list.append(rows);
		tracker.update(rows.length, lastCursor);
	}
	else
	{
		tracker.hasMoreData = false;
	}
};

/**
 * Update the rows in the list by prepending older items and update the tracker state.
 * Used when scrolling up to load older items.
 * Preserves scroll position to prevent content jumping.
 *
 * @param {Array} rows
 * @param {PaginationTracker} tracker
 * @param {object} list
 * @param {string|null} lastCursor - The last cursor value.
 * @param {HTMLElement|globalThis} container - The scroll container.
 * @returns {void}
 */
export const updateRowsAtTop = (rows, tracker, list, lastCursor = null, container = null) =>
{
	if (rows && rows.length > 0)
	{
		// Save scroll position before prepending
		let scrollHeight = 0;
		let scrollTop = 0;

		if (container)
		{
			const metrics = getScrollMetrics(container);
			scrollHeight = metrics.scrollHeight;
			scrollTop = metrics.scrollTop;
		}

		// Prepend the rows
		list.prepend(rows);
		tracker.update(rows.length, lastCursor);

		// Restore scroll position to prevent jump
		if (container)
		{
			// Calculate the difference in height after prepending
			const newMetrics = getScrollMetrics(container);
			const heightDifference = newMetrics.scrollHeight - scrollHeight;

			// Adjust scroll position by the height difference
			if (container === globalThis)
			{
				globalThis.scrollTo(0, scrollTop + heightDifference);
			}
			else
			{
				// @ts-ignore
				container.scrollTop = scrollTop + heightDifference;
			}
		}
	}
	else
	{
		tracker.hasMoreData = false;
	}
};

/**
 * Update rows by prepending newer items to the list.
 *
 * @param {Array} rows
 * @param {PaginationTracker} tracker
 * @param {object} list
 * @param {string|number|null} newestId - The ID of the newest item.
 * @returns {void}
 */
export const prependRows = (rows, tracker, list, newestId = null) =>
{
	if (rows && rows.length > 0)
	{
		list.prepend(rows);
		// Update the newest ID to the first item's ID if available
		if (newestId !== null)
		{
			tracker.updateNewest(newestId);
		}
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
	return (tracker, callback) =>
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
			let lastCursor = null;
			if (response)
			{
				rows = response.rows || response.items || [];
				lastCursor = response.lastCursor || null;
			}
			callback(rows, lastCursor);
		};

		data.xhr.all('', resultCallback, tracker.currentOffset, tracker.limit, tracker.lastCursor);
	};
};

/**
 * Set up a fetch callback for loading newer data (forward pagination).
 * Uses the 'since' parameter to fetch items newer than the current newest ID.
 *
 * @param {object} data
 * @returns {function}
 */
export const setupFetchNewerCallback = (data) =>
{
	return (tracker, callback) =>
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
			let newestId = null;
			if (response)
			{
				rows = response.rows || response.items || [];
				// Get the newest ID - use last item for ASC order, first item for DESC order
				// For fetchNewer, we want the highest ID which is typically the last item
				if (rows.length > 0)
				{
					const lastItem = rows[rows.length - 1];
					if (lastItem?.id)
					{
						newestId = lastItem.id;
					}
				}
			}
			callback(rows, newestId);
		};

		// Pass since as a parameter to the all method
		data.xhr.all('', resultCallback, 0, tracker.limit, null, tracker.newestId);
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
	fetchCallback(tracker, (rows, lastCursor) =>
	{
		updateRows(rows, tracker, list, lastCursor);
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
	fetchCallback(tracker, (rows, lastCursor) =>
	{
		list.reset();
		updateRows(rows, tracker, list, lastCursor);

		// Set the newest ID from the last item if available
		// (rows are typically in ASC order, so last item has highest ID)
		if (rows && rows.length > 0)
		{
			const lastItem = rows[rows.length - 1];
			if (lastItem?.id)
			{
				tracker.updateNewest(lastItem.id);
			}
		}
	});
};

/**
 * Fetch and prepend newer items to the list.
 * This is designed to be called manually (e.g., via timer/polling) rather than on scroll.
 *
 * @param {function} fetchNewerCallback
 * @param {PaginationTracker} tracker
 * @param {object} list
 * @returns {void}
 */
export const fetchAndPrepend = (fetchNewerCallback, tracker, list) =>
{
	if (!tracker.canLoadNewer())
	{
		return;
	}

	if (tracker.loadingNewer)
	{
		return;
	}

	tracker.loadingNewer = true;
	fetchNewerCallback(tracker, (rows, newestId) =>
	{
		prependRows(rows, tracker, list, newestId);
		tracker.loadingNewer = false;
	});
};

/**
 * Create a scroll event handler for the container.
 *
 * This handler ensures that loading is triggered only when the user is close
 * to the bottom/top of the container and prevents multiple concurrent loads.
 *
 * @param {object} container - The scrollable container.
 * @param {PaginationTracker} tracker - The pagination tracker.
 * @param {function} fetchCallback - Function to fetch data.
 * @param {string} [direction='down'] - Scroll direction: 'down' for bottom loading, 'up' for top loading.
 * @returns {function} A scroll event handler function.
 */
export const createScrollHandler = (container, tracker, fetchCallback, direction = 'down') =>
{
	const canLoadFunc = direction === 'up' ? canLoadAtTop : canLoad;
	const isUpDirection = direction === 'up';

	return (e, { list }, callBack) =>
	{
		const metrics = getScrollMetrics(container);
		if (canLoadFunc(metrics, tracker))
		{
			// Prevent multiple concurrent loads
			if (tracker.loading)
			{
				return;
			}

			tracker.loading = true;
			fetchCallback(tracker, (rows, lastCursor) =>
			{
				if (callBack)
				{
					callBack();
				}

				// Check if this is initial load BEFORE updating (which increments offset)
				const isInitialLoad = tracker.currentOffset === 0;

				// Use appropriate update function based on direction
				if (isUpDirection)
				{
					// For 'up' direction, pass container to preserve scroll position
					updateRowsAtTop(rows, tracker, list, lastCursor, container);

					// Set newestId from the last item if this is initial load
					// (rows are typically in ASC order, so last item has highest ID)
					if (isInitialLoad && rows && rows.length > 0)
					{
						const lastItem = rows[rows.length - 1];
						if (lastItem?.id)
						{
							tracker.updateNewest(lastItem.id);
						}
					}
				}
				else
				{
					updateRows(rows, tracker, list, lastCursor);
				}

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
			fetchCallback(tracker, (rows, lastCursor) =>
			{
				if (callBack)
				{
					callBack();
				}

				updateRows(rows, tracker, list, lastCursor);
				tracker.loading = false;
			});
		}
	};
};
