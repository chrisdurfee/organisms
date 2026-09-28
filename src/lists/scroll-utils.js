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
 * Wrap a scroll handler so it runs at most once per animation frame.
 *
 * Scroll events fire several times per frame during a fling, and every
 * call reads scrollTop, clientHeight and scrollHeight, which forces a
 * layout while rows are being inserted. Coalescing to one call per frame
 * keeps those reads to one per painted frame without changing when a
 * page load is triggered — the handler always re-reads the live metrics.
 *
 * The returned function exposes `cancel()` so the owner can drop a
 * pending frame when it is destroyed.
 *
 * @param {function} callBack
 * @returns {function}
 */
export const rafThrottle = (callBack) =>
{
	let frame = null;

	/**
	 * The queued handler. Arguments are forwarded from the first event of
	 * the frame; the scroll handlers only use them to identify the parent
	 * scope, which does not change between events.
	 *
	 * @returns {void}
	 */
	const throttled = (...args) =>
	{
		if (frame !== null)
		{
			return;
		}

		frame = requestAnimationFrame(() =>
		{
			frame = null;
			callBack(...args);
		});
	};

	/**
	 * Drops a queued frame so a destroyed owner is never called back.
	 *
	 * @returns {void}
	 */
	throttled.cancel = () =>
	{
		if (frame !== null)
		{
			cancelAnimationFrame(frame);
			frame = null;
		}
	};

	return throttled;
};

/**
 * Check whether an ID can be compared as a number (a finite number or
 * a numeric string such as "42").
 *
 * @param {*} value
 * @returns {boolean}
 */
const isNumericId = (value) =>
{
	if (typeof value === 'number')
	{
		return Number.isFinite(value);
	}

	return (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)));
};

/**
 * Extract the newest ID from an array of rows by detecting sort order.
 * Compares first and last item IDs to determine if data is in ASC or DESC order.
 *
 * Numeric IDs (including numeric strings) are compared as numbers so
 * "10" ranks above "9"; any other IDs fall back to a plain comparison.
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

	// A list without a configured key still identifies rows by 'id'.
	key = key || 'id';

	// Use null-safe checks so falsy-but-valid IDs (e.g. 0) are not skipped.
	const firstId = rows[0]?.[key] ?? null;
	const lastId = rows[rows.length - 1]?.[key] ?? null;

	// Both items have IDs - compare to detect sort order
	if (firstId !== null && lastId !== null)
	{
		// If first ID > last ID, it's DESC order (newest first)
		// If first ID < last ID, it's ASC order (oldest first)
		const isFirstNewer = (isNumericId(firstId) && isNumericId(lastId))
			? Number(firstId) > Number(lastId)
			: firstId > lastId;

		return isFirstNewer ? firstId : lastId;
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
 * Read the list registered on the parent under the cache name without
 * warning. Used to remember which list a request was issued for.
 *
 * @param {object} parent
 * @param {string} [listCache='list']
 * @returns {object|null}
 */
const peekListFromParent = (parent, listCache = 'list') =>
{
	return parent?.[listCache ?? 'list'] ?? null;
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
 * The callback is invoked as `callback(rows, lastCursor, failed)`. The
 * base XHR reports a network or HTTP error by passing `false` as the
 * response, which is surfaced as `failed = true` so the handlers can
 * keep the current rows instead of treating the failure as an empty
 * page. Custom `loadMoreItems` functions may pass the same third
 * argument to report their own failures.
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
		 * @param {object|null|false} response
		 * @returns {void}
		 */
		const resultCallback = (response) =>
		{
			if (!response)
			{
				callback([], null, true);
				return;
			}

			const rows = response.rows || response.items || [];
			const lastCursor = response.lastCursor || null;
			callback(rows, lastCursor, false);
		};

		data.xhr[xhrMethod || 'all']('', resultCallback, tracker.currentOffset, tracker.limit, tracker.lastCursor);
	};
};

/**
 * Resolve the row key used to read item IDs. Accepts a key name or a
 * function returning one, so a container can supply the key of a list
 * that registers after the callback is created.
 *
 * @param {string|function|null|undefined} key
 * @returns {string}
 */
const resolveKey = (key) =>
{
	const value = (typeof key === 'function') ? key() : key;
	return value || 'id';
};

/**
 * Set up a fetch callback for loading newer data (forward pagination).
 * Uses the 'since' parameter to fetch items newer than the current newest ID.
 *
 * The callback is invoked as `callback(rows, newestId, failed)`; see
 * setupFetchCallback() for the failure flag.
 *
 * @param {object} data
 * @param {string} [xhrMethod='all'] - The method name to call on data.xhr.
 * @param {string|function} [key='id'] - The row key holding the item ID, or
 *   a function returning it.
 * @returns {function}
 */
export const setupFetchNewerCallback = (data, xhrMethod = 'all', key = 'id') =>
{
	return (tracker, callback) =>
	{
		/**
		 * This will handle the result of the fetch.
		 *
		 * @param {object|null|false} response
		 * @returns {void}
		 */
		const resultCallback = (response) =>
		{
			if (!response)
			{
				callback([], null, true);
				return;
			}

			const rows = response.rows || response.items || [];
			callback(rows, getNewestId(rows, resolveKey(key)), false);
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
	const generation = tracker.generation;
	fetchCallback(tracker, (rows, lastCursor, failed = false) =>
	{
		// A failed request is not an empty page, and a superseded one
		// belongs to a state that no longer exists.
		if (failed === true || !tracker.isCurrent(generation))
		{
			return;
		}

		updateRows(rows, tracker, list, lastCursor);
	});
};

/**
 * Fetch and refresh the list.
 *
 * The first page is requested with a fresh tracker so the live tracker
 * keeps its position until the response arrives: a failed refresh then
 * leaves both the rows and the pagination exactly as they were. The
 * live tracker is marked as loading for the duration so a scroll load
 * cannot run alongside the refresh and append page one twice, and any
 * request still in flight (including an earlier refresh) is superseded.
 *
 * @param {function} fetchCallback
 * @param {PaginationTracker} tracker
 * @param {object} list
 * @returns {void}
 */
export const fetchAndRefresh = (fetchCallback, tracker, list) =>
{
	tracker.cancel();
	tracker.loading = true;
	const generation = tracker.generation;

	const requestTracker = new PaginationTracker(tracker.initialOffset, tracker.limit);
	invokeFetch(fetchCallback, requestTracker, (rows, lastCursor, failed = false) =>
	{
		if (!tracker.isCurrent(generation))
		{
			return;
		}

		/**
		 * Keep the current rows and pagination on failure; only the
		 * loading flag is released so the refresh can be retried.
		 */
		if (failed === true)
		{
			tracker.loading = false;
			return;
		}

		tracker.reset();
		list.reset();
		updateRows(rows, tracker, list, lastCursor);

		// Set the newest ID by detecting sort order
		const newestId = getNewestId(rows, list.key);
		if (newestId !== null)
		{
			tracker.updateNewest(newestId);
		}
	}, () =>
	{
		if (tracker.isCurrent(generation))
		{
			tracker.loading = false;
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
 * The smallest number of rows a single revalidation request covers.
 * The effective default cap is max(limit, MIN_REVALIDATE_LIMIT).
 *
 * @type {number}
 */
const MIN_REVALIDATE_LIMIT = 50;

/**
 * Resolve how many resumed rows one revalidation request may cover.
 *
 * @param {number|null|undefined} revalidateLimit - An explicit cap.
 * @param {number} pageLimit - The container page size.
 * @returns {number}
 */
export const getRevalidateLimit = (revalidateLimit, pageLimit) =>
{
	const explicit = Math.floor(Number(revalidateLimit));
	if (Number.isFinite(explicit) && explicit > 0)
	{
		return explicit;
	}

	const limit = Math.floor(Number(pageLimit)) || 0;
	return Math.max(limit, MIN_REVALIDATE_LIMIT);
};

/**
 * Merge a fresh first page into the resumed rows, both in server order.
 *
 * The refreshed window runs from the first resumed row up to the last
 * resumed row that the fresh page still contains (the anchor). Inside
 * the window the fresh page is authoritative: changed rows update, new
 * rows are added and resumed rows it no longer returns are removed.
 * Rows after the anchor were not covered by the request (the server may
 * also cap the limit) and stay as they are, minus any that moved into
 * the window. When the response is known to reach the end of the data
 * the whole resumed list is covered.
 *
 * @param {Array<object>} resumed - The resumed rows in server order.
 * @param {Array<object>} fresh - The fresh rows in server order.
 * @param {string} key
 * @param {boolean} reachedEnd - The response covers every remaining row.
 * @returns {Array<object>}
 */
export const mergeResumedWindow = (resumed, fresh, key, reachedEnd = false) =>
{
	const freshKeys = new Set();
	for (let i = 0, length = fresh.length; i < length; i++)
	{
		const row = fresh[i];
		if (row)
		{
			freshKeys.add(row[key]);
		}
	}

	let anchor = -1;
	if (reachedEnd)
	{
		anchor = resumed.length - 1;
	}
	else
	{
		for (let i = resumed.length - 1; i >= 0; i--)
		{
			const row = resumed[i];
			if (row && freshKeys.has(row[key]))
			{
				anchor = i;
				break;
			}
		}
	}

	const merged = fresh.slice();
	for (let i = anchor + 1, length = resumed.length; i < length; i++)
	{
		const row = resumed[i];
		if (!row || !freshKeys.has(row[key]))
		{
			merged.push(row);
		}
	}
	return merged;
};

/**
 * Check whether two row arrays hold the same keys in the same order.
 *
 * @param {Array<object>} a
 * @param {Array<object>} b
 * @param {string} key
 * @returns {boolean}
 */
const sameKeyOrder = (a, b, key) =>
{
	if (a.length !== b.length)
	{
		return false;
	}

	for (let i = 0, length = a.length; i < length; i++)
	{
		if ((a[i] && a[i][key]) !== (b[i] && b[i][key]))
		{
			return false;
		}
	}
	return true;
};

/**
 * Apply a merged window to the list with the least DOM work.
 *
 * - Same rows in the same order: only the changed rows are replaced.
 * - Keyed lists without dividers: a keyed reconcile reuses every
 *   unchanged row node and only inserts, moves or removes what changed.
 * - Divider lists cannot be reconciled (the seams are position
 *   sensitive), so they are rebuilt in one synchronous pass; nothing is
 *   painted in between, so the rows never flash.
 *
 * @param {object} list
 * @param {Array<object>} resumed - The resumed rows in list order.
 * @param {Array<object>} merged - The merged rows in server order.
 * @param {Array<object>} fresh - The fresh rows in server order.
 * @param {string} direction - 'down' or 'up'.
 * @returns {void}
 */
const applyResumedWindow = (list, resumed, merged, fresh, direction) =>
{
	const key = list.key;

	/**
	 * 'up' lists prepend each page, which reverses it, so the list order
	 * is the reverse of the server order.
	 */
	const items = (direction === 'up')? merged.slice().reverse() : merged;

	if (sameKeyOrder(resumed, items, key))
	{
		list.modify(fresh);
		return;
	}

	if (!list.rowDivider && typeof list.setRows === 'function')
	{
		list.setRows(items);
		return;
	}

	list.reset();
	if (direction === 'up')
	{
		list.prepend(merged);
		return;
	}

	list.append(merged);
};

/**
 * Revalidate rows resumed from a persisted list without resetting the
 * list (stale-while-revalidate). Every container uses this on resume.
 *
 * The classic mount flow (reset + fetch page one) is jarring after a
 * resume: the restored rows paint, then get wiped down to the first
 * page, the scroll position collapses, and any scroll restorer has to
 * re-page all the way back down. Instead, this keeps every resumed row
 * on screen and issues ONE request for the start of the loaded window,
 * capped at `revalidateLimit` rows (default max(limit, 50)). The
 * response is merged in place by key (see mergeResumedWindow): changed
 * rows update, new rows are added and rows missing from the refreshed
 * window are removed; rows beyond the cap stay as they are.
 *
 * Two cases swap the window wholesale because the resumed rows are
 * provably stale: an EMPTY first page (query has no rows — clear to the
 * empty state), and a first page with NO key overlap against the
 * resumed rows (the resumed window belongs to a different result set,
 * e.g. a persist token shared across entities).
 *
 * Pagination continues after the resumed rows: the offset is set to the
 * merged row count, and the response cursor is only adopted when the
 * response covered every resumed row (a truncated response's cursor
 * would rewind cursor-based feeds and duplicate rows). A failed request
 * keeps the resumed rows untouched.
 *
 * @param {Function} fetchCallback
 * @param {PaginationTracker} tracker
 * @param {object} list
 * @param {object} [options]
 * @param {string} [options.direction='down'] - 'up' for lists whose
 *   pages are prepended (chat), where the list order is reversed.
 * @param {number} [options.revalidateLimit] - Cap for the request size.
 * @param {function} [options.onApply] - Wraps applying the response:
 *   called as `onApply(apply)` and must call `apply()`. Lets a container
 *   measure the scroll position before and restore it after.
 * @returns {void}
 */
export const revalidateResumedRows = (fetchCallback, tracker, list, options = {}) =>
{
	const direction = options.direction || 'down';
	const resumed = list.getRows().slice();
	const count = resumed.length;

	tracker.reset();
	tracker.loading = true;
	const generation = tracker.generation;
	const startOffset = tracker.initialOffset;
	const requested = Math.min(count, getRevalidateLimit(options.revalidateLimit, tracker.limit));

	const windowTracker = new PaginationTracker(startOffset, requested);
	invokeFetch(fetchCallback, windowTracker, (rows, lastCursor, failed = false) =>
	{
		// A reset, refresh or destroy since the request was issued owns
		// the list now.
		if (!tracker.isCurrent(generation))
		{
			return;
		}

		tracker.loading = false;

		/**
		 * A failed request says nothing about the resumed rows, so keep
		 * them on screen and continue pagination after the window, the
		 * same as a truncated response (no cursor is adopted).
		 */
		if (failed === true)
		{
			tracker.currentOffset = startOffset + count;
			return;
		}

		const apply = () =>
		{
			/**
			 * The server says this query's first page is empty — the
			 * resumed rows cannot belong to it (e.g. they were persisted
			 * under a token another entity's list also resolves to).
			 * Clear them so the empty state shows instead of another
			 * list's data.
			 */
			if (!rows || rows.length === 0)
			{
				list.reset();
				tracker.hasMoreData = false;
				list.updateHasItems();
				return;
			}

			const key = list.key;

			/**
			 * Without a key rows cannot be matched, so the resumed rows
			 * stay as they are and only pagination continues.
			 */
			if (!key)
			{
				tracker.currentOffset = startOffset + count;
				return;
			}

			/**
			 * No key overlap between the resumed window and the fresh
			 * first page means the resumed rows belong to a DIFFERENT
			 * result set — swap wholesale instead of merging, so stale
			 * rows never linger under fresh ones.
			 */
			const resumedKeys = new Set(resumed.map((row) => row && row[key]));
			const overlaps = rows.some((row) => row && resumedKeys.has(row[key]));
			if (!overlaps)
			{
				list.reset();
				if (direction === 'up')
				{
					updateRowsAtTop(rows, tracker, list, lastCursor ?? null);
				}
				else
				{
					updateRows(rows, tracker, list, lastCursor ?? null);
				}

				const freshNewest = getNewestId(rows, key);
				if (freshNewest !== null)
				{
					tracker.updateNewest(freshNewest);
				}
				return;
			}

			/**
			 * A short response to a request no larger than one page is
			 * the end of the data (a server honours its own page size),
			 * so the refresh covers every resumed row.
			 */
			const reachedEnd = (rows.length < requested && requested <= tracker.limit);
			const serverOrder = (direction === 'up')? resumed.slice().reverse() : resumed;
			const merged = mergeResumedWindow(serverOrder, rows, key, reachedEnd);

			applyResumedWindow(list, resumed, merged, rows, direction);
			list.updateHasItems();

			/**
			 * Genuine resume: continue pagination from the end of the
			 * merged rows.
			 */
			tracker.currentOffset = startOffset + merged.length;
			if (reachedEnd)
			{
				tracker.hasMoreData = false;
			}

			const coveredAll = (requested >= count && rows.length >= requested);
			if (coveredAll || reachedEnd)
			{
				tracker.lastCursor = lastCursor ?? null;
			}

			const newestId = getNewestId(rows, key);
			if (newestId !== null)
			{
				tracker.updateNewest(newestId);
			}
		};

		if (typeof options.onApply === 'function')
		{
			options.onApply(apply);
			return;
		}

		apply();
	}, () =>
	{
		if (tracker.isCurrent(generation))
		{
			tracker.loading = false;
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
	const generation = tracker.generation;
	invokeFetch(fetchNewerCallback, tracker, (rows, newestId, failed = false) =>
	{
		// A reset since the request was issued already released the flag.
		if (!tracker.isCurrent(generation))
		{
			return;
		}

		if (failed !== true)
		{
			prependRows(rows, tracker, list, newestId);
		}
		tracker.loadingNewer = false;
	}, () =>
	{
		if (tracker.isCurrent(generation))
		{
			tracker.loadingNewer = false;
		}
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
 * @param {object|null} [rowWindow] - A RowWindow that caps the rows (`maxRows`). Loaded
 *   pages are recorded on it, and scrolling back to rows it dropped re-fetches them.
 * @returns {function} A scroll event handler function.
 */
export const createScrollHandler = (container, tracker, fetchCallback, direction = 'down', listCache = 'list', threshold, rowWindow = null) =>
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

		/**
		 * Rows the window dropped from the newest end come back first
		 * when the user scrolls back to that end.
		 */
		// @ts-ignore
		if (!callBack && rowWindow && !tracker.loading && rowWindow.hasTrimmed() && rowWindow.isNearTrimmedEdge(metrics, effectiveThreshold))
		{
			const list = getListFromParent(parent, listCache);
			// @ts-ignore
			if (list && rowWindow.restore(list))
			{
				return;
			}
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

			/**
			 * Remember which request this is and which list it was issued
			 * for. A reset, refresh or destroy moves the tracker generation
			 * on, and a replacement list can register under the same cache
			 * name; in both cases the response belongs to a state that no
			 * longer exists and must not be applied.
			 */
			const generation = tracker.generation;
			const owner = peekListFromParent(parent, listCache);

			/**
			 * The position this page is requested from, so the row
			 * window can repeat the request after dropping the page.
			 */
			const request = { offset: tracker.currentOffset, cursor: tracker.lastCursor };

			invokeFetch(fetchCallback, tracker, (rows, lastCursor, failed = false) =>
			{
				if (!tracker.isCurrent(generation))
				{
					return;
				}

				// Re-read the list reference here so it resolves after the async
				// fetch completes. When BiDirectionalContainer is used inside an
				// Atom (no intermediate Component scope), the child List Jot may
				// not yet have registered itself as parent[listCache] at the time
				// handleScroll is called synchronously during onCreated.
				const list = getListFromParent(parent, listCache);

				// Without a list reference (or with a different list than the
				// one the request was for) there is nothing to update; release
				// the loading flag so pagination is not permanently frozen.
				if (!list || (owner && list !== owner))
				{
					tracker.loading = false;
					return;
				}

				/**
				 * A failed request is not an empty page: keep the current
				 * rows (skipping the initial reset), leave hasMoreData alone
				 * and release the flag so the next scroll can retry.
				 */
				if (failed === true)
				{
					tracker.loading = false;
					return;
				}

				if (callBack)
				{
					callBack();
				}

				// Check if this is initial load BEFORE updating (which increments offset)
				const isInitialLoad = tracker.currentOffset === tracker.initialOffset;

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
						// A reset during the restore frames owns the flag now.
						if (!tracker.isCurrent(generation))
						{
							return;
						}

						/**
						 * Trim once the scroll restore has settled: removing
						 * the bottom rows earlier would shrink the height the
						 * restore measures against.
						 */
						if (rowWindow && rows && rows.length > 0)
						{
							// @ts-ignore
							rowWindow.record(list, request, rows.length);
						}

						// Arm the cooldown before releasing so the same fling's
						// trailing scroll events can't immediately re-trigger.
						cooldownUntil = performance.now() + 300;
						tracker.loading = false;
					});
				}
				else
				{
					updateRows(rows, tracker, list, lastCursor);
					if (rowWindow && rows && rows.length > 0)
					{
						// @ts-ignore
						rowWindow.record(list, request, rows.length);
					}
					tracker.loading = false;
				}

				/**
				 * Set newestId from the initial page (both directions) so
				 * forward pagination (fetchNew) never polls with a null
				 * cursor, which could re-fetch and duplicate the first page.
				 */
				if (isInitialLoad)
				{
					const newestId = getNewestId(rows, list.key);
					if (newestId !== null)
					{
						tracker.updateNewest(newestId);
					}
				}
			}, () =>
			{
				if (tracker.isCurrent(generation))
				{
					tracker.loading = false;
				}
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
			const generation = tracker.generation;
			invokeFetch(fetchCallback, tracker, (rows, lastCursor, failed = false) =>
			{
				// Superseded by a reset, refresh or destroy.
				if (!tracker.isCurrent(generation))
				{
					return;
				}

				// Keep the current rows on failure so the next scroll can retry.
				if (failed === true)
				{
					tracker.loading = false;
					return;
				}

				if (callBack)
				{
					callBack();
				}

				updateRows(rows, tracker, list, lastCursor);
				tracker.loading = false;
			}, () =>
			{
				if (tracker.isCurrent(generation))
				{
					tracker.loading = false;
				}
			});
		}
	};
};
