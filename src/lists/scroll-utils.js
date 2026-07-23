import { PaginationTracker } from "./pagination-tracker.js";

/**
 * Default scroll threshold (in pixels) used as a hard fallback when the
 * viewport size cannot be determined. In practice the resolved default
 * is one viewport height (see `resolveThreshold`), which matches the
 * prefetch behavior used by Twitter, YouTube, Instagram and other
 * modern infinite-scroll feeds.
 */
const SCROLL_THRESHOLD = 100;

/**
 * Resolve a user-supplied threshold to a pixel value.
 *
 * Accepted forms:
 * - `undefined` / `null`  -> one viewport height (best default for prefetch)
 * - `number`              -> exact pixel value
 * - `function(metrics)`   -> dynamic value computed from current metrics
 *
 * @param {number|function|null|undefined} threshold
 * @param {object} metrics - The scroll metrics (scrollTop, clientHeight, scrollHeight).
 * @returns {number}
 */
export function resolveThreshold(threshold, metrics)
{
	if (typeof threshold === 'function')
	{
		return threshold(metrics) || 0;
	}

	if (typeof threshold === 'number')
	{
		return threshold;
	}

	// Default: prefetch when the user is within one viewport height
	// of the trigger edge. Falls back to SCROLL_THRESHOLD if metrics
	// are unavailable for any reason.
	return metrics?.clientHeight || SCROLL_THRESHOLD;
}

/**
 * Extract the newest ID from an array of rows by detecting sort order.
 * Compares first and last item IDs to determine if data is in ASC or DESC order.
 *
 * @param {Array} rows - The array of row objects
 * @param {string} [key='id'] - The property holding the item ID.
 * @returns {number|string|null} The highest ID, or null if no valid ID found
 */
export function getNewestId(rows, key = 'id')
{
	if (!rows || rows.length === 0)
	{
		return null;
	}

	// Use null-safe checks so falsy-but-valid IDs (e.g. 0) are not skipped.
	const firstId = rows[0]?.[key] ?? null;
	const lastId = rows[rows.length - 1]?.[key] ?? null;

	// Both items have IDs - compare to detect sort order
	if (firstId !== null && lastId !== null)
	{
		// If first ID > last ID, it's DESC order (newest first)
		// If first ID < last ID, it's ASC order (oldest first)
		return firstId > lastId ? firstId : lastId;
	}

	// Only one item has an ID - return whichever exists
	return firstId ?? lastId;
}

/**
 * Safely resolve the child list registered on the parent under the
 * cache name. Logs a warning instead of throwing when the list has
 * not registered itself yet (wrong/missing `cache` prop, or an Atom
 * used without an intermediate component scope).
 *
 * @param {object} parent
 * @param {string} [listCache='list']
 * @returns {object|null}
 */
export const getListFromParent = (parent, listCache = 'list') =>
{
	const cacheName = listCache ?? 'list';
	const list = parent?.[cacheName] ?? null;
	if (!list)
	{
		console.warn(`[organisms] No list found on parent under cache name "${cacheName}". Check that the List "cache" prop matches the container "listCache" prop.`);
	}
	return list;
};

/**
 * This will add the refresh method to the list.
 *
 * @param {Function} fetchCallback
 * @param {PaginationTracker} tracker
 * @param {object} list
 * @returns {void}
 */
export const addRefreshMethod = (fetchCallback, tracker, list) =>
{
	list.refresh = () => fetchAndRefresh(fetchCallback, tracker, list);
};

/**
 * Invoke a fetch callback defensively. If the callback throws
 * synchronously or returns a rejected promise, onError is invoked so
 * loading flags are always released and pagination never deadlocks.
 *
 * @param {Function} fetchCallback
 * @param {PaginationTracker} tracker
 * @param {Function} handler
 * @param {Function} onError
 * @returns {void}
 */
export const invokeFetch = (fetchCallback, tracker, handler, onError) =>
{
	try
	{
		const result = fetchCallback(tracker, handler);
		// @ts-ignore
		if (result && typeof result.catch === 'function')
		{
			// @ts-ignore
			result.catch((error) =>
			{
				console.error('[organisms] Fetch callback failed:', error);
				onError();
			});
		}
	}
	catch (error)
	{
		console.error('[organisms] Fetch callback failed:', error);
		onError();
	}
};

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
 * @param {number|function|null} [threshold] - The threshold in pixels, a function
 *   `(metrics) => pixels`, or null/undefined to use one viewport height.
 * @returns {boolean}
 */
export function shouldLoadMore(metrics, threshold)
{
	const px = resolveThreshold(threshold, metrics);
	return metrics.scrollTop + metrics.clientHeight >= metrics.scrollHeight - px;
}

/**
 * Check if the scroll position indicates we should load more items at the top.
 *
 * @param {object} metrics - The scroll metrics.
 * @param {number|function|null} [threshold] - The threshold in pixels, a function
 *   `(metrics) => pixels`, or null/undefined to use one viewport height.
 * @returns {boolean}
 */
export function shouldLoadAtTop(metrics, threshold)
{
	const px = resolveThreshold(threshold, metrics);
	// Ignore iOS rubber-band overscroll: scrollTop goes negative at the very
	// top of a momentum fling. Triggering a prepend mid-overscroll is a main
	// cause of the jerky / jump-to-top behavior on WebKit, so require a
	// non-negative scrollTop before loading older items.
	return metrics.scrollTop >= 0 && metrics.scrollTop <= px;
}

/**
 * Check if more items can be loaded at the bottom based on metrics and tracker state.
 *
 * @param {object} metrics - The scroll metrics.
 * @param {PaginationTracker} tracker - The pagination tracker.
 * @param {number|function|null} [threshold] - Optional prefetch threshold.
 * @returns {boolean}
 */
export const canLoad = (metrics, tracker, threshold) =>
{
	return shouldLoadMore(metrics, threshold) && tracker.canLoadMore();
};

/**
 * Check if more items can be loaded at the top based on metrics and tracker state.
 *
 * @param {object} metrics - The scroll metrics.
 * @param {PaginationTracker} tracker - The pagination tracker.
 * @param {number|function|null} [threshold] - Optional prefetch threshold.
 * @returns {boolean}
 */
export const canLoadAtTop = (metrics, tracker, threshold) =>
{
	return shouldLoadAtTop(metrics, threshold) && tracker.canLoadMore();
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

		// Let the list decide hasItems based on its actual items.
		// After a reset + empty response, items is [] so hasItems becomes false.
		// After loading items + last page empty, items still has data so hasItems stays true.
		list.updateHasItems();
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
 * @param {HTMLElement|globalThis|null} [container] - The scroll container.
 * @param {function|null} [onComplete] - Invoked once the prepend and the
 *   scroll-position restore have fully applied. Lets callers hold their
 *   loading flag until the viewport is settled (important on iOS).
 * @returns {void}
 */
export const updateRowsAtTop = (rows, tracker, list, lastCursor = null, container = null, onComplete = null) =>
{
	/**
	 * Signals the caller that the update (and any scroll restore) is done.
	 */
	const done = () =>
	{
		if (typeof onComplete === 'function')
		{
			onComplete();
		}
	};

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

		// Check if we received fewer rows than the limit, indicating no more data
		if (rows.length < tracker.limit)
		{
			tracker.hasMoreData = false;

			// Add a trailing divider to show the date of the oldest items
			if (list.addTrailingDivider)
			{
				list.addTrailingDivider();
			}
		}

		if (!container)
		{
			done();
			return;
		}

		/**
		 * Reads the current scroll offset of the container.
		 *
		 * @returns {number}
		 */
		const currentScrollTop = () =>
			// @ts-ignore
			(container === globalThis) ? globalThis.pageYOffset : container.scrollTop;

		/**
		 * Measures the new scroll height and adjusts scrollTop by the
		 * difference so the viewport stays anchored on the same content.
		 * Re-measures every call so late layout (images, fonts) that grows
		 * the prepended block is absorbed automatically.
		 *
		 * @returns {number} The scroll offset that was applied.
		 */
		const restoreScrollPosition = () =>
		{
			const newMetrics = getScrollMetrics(container);
			const heightDifference = newMetrics.scrollHeight - scrollHeight;
			const target = scrollTop + heightDifference;

			if (container === globalThis)
			{
				globalThis.scrollTo(0, target);
			}
			else
			{
				// @ts-ignore
				container.scrollTop = target;
			}

			return target;
		};

		/**
		 * The dynamic list mutates the DOM synchronously during prepend
		 * (ChildHelper writes the rows immediately and the silent data patch
		 * skips the reactive publish), so the new height is measurable right
		 * away. Correct the scroll offset synchronously FIRST — before the
		 * browser paints — so the viewport never visibly jumps down (the
		 * "jerky" symptom).
		 *
		 * On iOS the scroll position is also reconciled on a separate thread,
		 * so a write issued while a momentum fling is still decelerating can
		 * be silently ignored — leaving the user near the top, which then
		 * lets the next momentum scroll event fire another prepend and walk
		 * the list all the way to the top. Re-assert the correction across a
		 * few frames until it actually sticks, and hold the loading flag
		 * (via done()) until then so a single fling cannot cascade.
		 */
		const applyRestore = () =>
		{
			let target = restoreScrollPosition();
			let frames = 0;

			const settle = () =>
			{
				target = restoreScrollPosition();
				const landed = Math.abs(currentScrollTop() - target) <= 2;
				if (landed || ++frames >= 6)
				{
					done();
					return;
				}

				requestAnimationFrame(settle);
			};

			requestAnimationFrame(settle);
		};

		applyRestore();
	}
	else
	{
		tracker.hasMoreData = false;

		// Let the list decide hasItems based on its actual items.
		list.updateHasItems();

		// Add a trailing divider to show the date of the oldest items
		if (list.addTrailingDivider)
		{
			list.addTrailingDivider();
		}

		done();
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
 * @param {string} [xhrMethod='all'] - The method name to call on data.xhr.
 * @returns {function}
 */
export const setupFetchCallback = (data, xhrMethod = 'all') =>
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

		data.xhr[xhrMethod]('', resultCallback, tracker.currentOffset, tracker.limit, tracker.lastCursor);
	};
};

/**
 * Set up a fetch callback for loading newer data (forward pagination).
 * Uses the 'since' parameter to fetch items newer than the current newest ID.
 *
 * @param {object} data
 * @param {string} [xhrMethod='all'] - The method name to call on data.xhr.
 * @returns {function}
 */
export const setupFetchNewerCallback = (data, xhrMethod = 'all') =>
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
				newestId = getNewestId(rows);
			}
			callback(rows, newestId);
		};

		// Pass since as a parameter to the xhr method
		data.xhr[xhrMethod]('', resultCallback, 0, tracker.limit, null, tracker.newestId);
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

		// Set the newest ID by detecting sort order
		const newestId = getNewestId(rows);
		if (newestId !== null)
		{
			tracker.updateNewest(newestId);
		}
	});
};

/**
 * Check whether a list resumed persisted rows that can be revalidated
 * in place. Skeleton placeholder items are rendered layouts, not row
 * data, so a list still showing its skeleton has nothing to revalidate.
 *
 * @param {object} list
 * @returns {boolean}
 */
export const hasResumedRows = (list) =>
{
	if (!list || list.persist !== true)
	{
		return false;
	}

	if (list.data && list.data.get('showSkeleton'))
	{
		return false;
	}

	const rows = (typeof list.getRows === 'function') ? list.getRows() : null;
	return (Array.isArray(rows) && rows.length > 0);
};

/**
 * Revalidate rows resumed from a persisted list without resetting the
 * list (stale-while-revalidate).
 *
 * The classic mount flow (reset + fetch page one) is jarring after a
 * resume: the restored rows paint, then get wiped down to the first
 * page, the scroll position collapses, and any scroll restorer has to
 * re-page all the way back down. Instead, this keeps every resumed row
 * on screen and issues ONE request covering the whole loaded window
 * (offset 0, limit = resumed row count). The response is merged in
 * place by key — rows the user edited elsewhere update, unchanged rows
 * are untouched — so there is no flash and the scroll position never
 * moves.
 *
 * Rows added or deleted server-side while the user was away are NOT
 * inserted or removed during an in-place refresh: the server may cap
 * the requested limit below the resumed count, which would make
 * missing keys indistinguishable from truncation. Two exceptions swap
 * the window wholesale because the resumed rows are provably stale:
 * an EMPTY first page (query has no rows — clear to the empty state),
 * and a first page with NO key overlap against the resumed rows (the
 * resumed window belongs to a different result set, e.g. a persist
 * token shared across entities).
 *
 * Pagination continues after the resumed window: the offset is set to
 * the resumed row count, and the response cursor is only adopted when
 * the response covered the full window (a truncated response's cursor
 * would rewind cursor-based feeds and duplicate rows).
 *
 * @param {Function} fetchCallback
 * @param {PaginationTracker} tracker
 * @param {object} list
 * @returns {void}
 */
export const revalidateResumedRows = (fetchCallback, tracker, list) =>
{
	const resumed = list.getRows();
	const count = resumed.length;

	tracker.reset();
	tracker.loading = true;

	const windowTracker = new PaginationTracker(0, count);
	invokeFetch(fetchCallback, windowTracker, (rows, lastCursor) =>
	{
		tracker.loading = false;

		/**
		 * The server says this query's first page is empty — the
		 * resumed rows cannot belong to it (e.g. they were persisted
		 * under a token another entity's list also resolves to). Clear
		 * them so the empty state shows instead of another list's data.
		 */
		if (!rows || rows.length === 0)
		{
			list.reset();
			tracker.hasMoreData = false;
			list.updateHasItems();
			return;
		}

		/**
		 * No key overlap between the resumed window and the fresh first
		 * page means the resumed rows belong to a DIFFERENT result set —
		 * swap wholesale instead of merging, so stale rows never linger
		 * under fresh ones.
		 */
		const key = list.key;
		const resumedKeys = new Set(resumed.map((row) => row && row[key]));
		const overlaps = rows.some((row) => row && resumedKeys.has(row[key]));
		if (!overlaps)
		{
			list.reset();
			updateRows(rows, tracker, list, lastCursor ?? null);

			const freshNewest = getNewestId(rows, key);
			if (freshNewest !== null)
			{
				tracker.updateNewest(freshNewest);
			}
			return;
		}

		/**
		 * Genuine resume: refresh the resumed rows in place and continue
		 * pagination from the end of the window.
		 */
		list.modify(rows);
		tracker.currentOffset = count;

		if (rows.length >= count)
		{
			tracker.lastCursor = lastCursor ?? null;
		}

		const newestId = getNewestId(rows, key);
		if (newestId !== null)
		{
			tracker.updateNewest(newestId);
		}
	}, () =>
	{
		tracker.loading = false;
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
	invokeFetch(fetchNewerCallback, tracker, (rows, newestId) =>
	{
		prependRows(rows, tracker, list, newestId);
		tracker.loadingNewer = false;
	}, () =>
	{
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
 * @param {string} [listCache='list'] - The list cache name.
 * @param {number|function|null} [threshold] - Prefetch threshold in pixels, a
 *   function `(metrics) => pixels`, or null/undefined to use one viewport height.
 *   Loading is triggered when the user is within this distance of the trigger edge,
 *   which lets new items render before they scroll into view (industry standard).
 * @returns {function} A scroll event handler function.
 */
export const createScrollHandler = (container, tracker, fetchCallback, direction = 'down', listCache = 'list', threshold) =>
{
	const canLoadFunc = direction === 'up' ? canLoadAtTop : canLoad;
	const isUpDirection = direction === 'up';

	// When scrolling up (chat-style prepend), prefetching a full viewport
	// early makes older pages load while the user is still mid-fling, which
	// reads as "loading too early". Default to half a viewport for the top
	// trigger so the prepend happens closer to the edge while still staying
	// ahead of a visible gap. Down-direction keeps the full-viewport default.
	const effectiveThreshold = (threshold === undefined && isUpDirection)
		? (metrics) => Math.round((metrics.clientHeight || SCROLL_THRESHOLD) * 0.5)
		: threshold;

	// Short suppression window applied after a top prepend settles. Residual
	// scroll events from the same iOS momentum fling would otherwise fire a
	// second prepend immediately (before the user has actually scrolled up
	// again), cascading the list toward the top. Only used for 'up'.
	let cooldownUntil = 0;

	return (e, parent, callBack) =>
	{
		const metrics = getScrollMetrics(container);

		// Honor the post-prepend cooldown for scroll-triggered top loads only.
		// The initial load (callBack present) always bypasses it.
		if (!callBack && isUpDirection && performance.now() < cooldownUntil)
		{
			return;
		}

		// Always fetch on the initial call (callBack signals the onCreated load).
		// The scroll-position check only gates subsequent pagination loads triggered
		// by scroll events, not the first data fetch.
		if (callBack || canLoadFunc(metrics, tracker, effectiveThreshold))
		{
			// Prevent multiple concurrent loads
			if (tracker.loading)
			{
				return;
			}

			tracker.loading = true;
			invokeFetch(fetchCallback, tracker, (rows, lastCursor) =>
			{
				// Re-read the list reference here so it resolves after the async
				// fetch completes. When BiDirectionalContainer is used inside an
				// Atom (no intermediate Component scope), the child List Jot may
				// not yet have registered itself as parent[listCache] at the time
				// handleScroll is called synchronously during onCreated.
				const list = getListFromParent(parent, listCache);

				if (callBack)
				{
					callBack();
				}

				// Without a list reference there is nothing to update; release
				// the loading flag so pagination is not permanently frozen.
				if (!list)
				{
					tracker.loading = false;
					return;
				}

				// Check if this is initial load BEFORE updating (which increments offset)
				const isInitialLoad = tracker.currentOffset === 0;

				// Use appropriate update function based on direction
				if (isUpDirection)
				{
					// For 'up' direction, pass the container to preserve scroll
					// position and hold the loading flag until the restore has
					// fully applied. Clearing it immediately lets the next scroll
					// event from the same iOS momentum fling start another prepend
					// before the position is corrected, cascading into the
					// jump-to-top.
					updateRowsAtTop(rows, tracker, list, lastCursor, container, () =>
					{
						// Arm the cooldown before releasing so the same fling's
						// trailing scroll events can't immediately re-trigger.
						cooldownUntil = performance.now() + 300;
						tracker.loading = false;
					});
				}
				else
				{
					updateRows(rows, tracker, list, lastCursor);
					tracker.loading = false;
				}

				/**
				 * Set newestId from the initial page (both directions) so
				 * forward pagination (fetchNew) never polls with a null
				 * cursor, which could re-fetch and duplicate the first page.
				 */
				if (isInitialLoad)
				{
					const newestId = getNewestId(rows);
					if (newestId !== null)
					{
						tracker.updateNewest(newestId);
					}
				}
			}, () =>
			{
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
 * @param {number|function|null} [threshold] - Prefetch threshold in pixels, a
 *   function `(metrics) => pixels`, or null/undefined to use one viewport height.
 * @returns {function} A scroll event handler function.
 */
export const createTableScrollHandler = (container, tracker, fetchCallback, threshold) =>
{
	return (e, list, callBack) =>
	{
		const metrics = getScrollMetrics(container);

		// Always fetch on the initial call.
		if (callBack || canLoad(metrics, tracker, threshold))
		{
			// Prevent multiple concurrent loads
			if (tracker.loading)
			{
				return;
			}

			tracker.loading = true;
			invokeFetch(fetchCallback, tracker, (rows, lastCursor) =>
			{
				if (callBack)
				{
					callBack();
				}

				updateRows(rows, tracker, list, lastCursor);
				tracker.loading = false;
			}, () =>
			{
				tracker.loading = false;
			});
		}
	};
};
