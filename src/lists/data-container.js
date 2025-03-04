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
 * A ScrollableList component that updates when its container is scrolled.
 *
 * @param {object} props
 * @property {Data} [props.data] - The data to use for the list.
 * @param {array} children - The child elements to render.
 * @returns {array}
 */
export const DataContainer = Atom((props, children) =>
{
	/**
	 * This will handle the scroll event.
	 *
	 * @param {number} offset - The offset to start loading from.
     * @param {number} limit - The number of items to load.
     * @param {function} callBack - The callback to call with the loaded items.
	 * @returns {void}
	 */
	const fetchData = (offset, limit, callBack) =>
	{
		props.data.xhr.all('', (response) =>
		{
			if (!response || response.success === false)
            {
                return;
            }

            const rows = response.rows || response.items || [];
            callBack(rows);
		});
	};

	return children;
});

export default DataContainer;