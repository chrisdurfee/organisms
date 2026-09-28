import { PaginationTracker } from './pagination-tracker.js';
import { getScrollMetrics, invokeFetch, shouldLoadAtTop, shouldLoadMore } from './scroll-utils.js';

/**
 * Sets the scroll offset of a container (or the window).
 *
 * @param {HTMLElement|globalThis} container
 * @param {number} top
 * @returns {void}
 */
const setScrollTop = (container, top) =>
{
	if (container === globalThis)
	{
		globalThis.scrollTo(0, top);
		return;
	}

	// @ts-ignore
	container.scrollTop = top;
};

/**
 * @typedef {object} WindowPage
 * @property {number} offset - The tracker offset the page was requested with.
 * @property {*} cursor - The tracker cursor the page was requested with.
 * @property {number} count - The rows of the page that are in the list.
 */

/**
 * RowWindow
 *
 * Caps how many rows a scroll list keeps (`maxRows`) and re-fetches the
 * rows it dropped when the user scrolls back to them.
 *
 * Pages are the unit of the window. Every page that lands at the loading
 * edge (the bottom for 'down' lists, the top for 'up' chat lists) is
 * recorded with the pagination state it was requested with. When the
 * rows exceed maxRows, whole pages are dropped from the opposite end
 * (the newest rows) and kept on a stack; scrolling back to that end
 * repeats the recorded request and puts the rows back. Putting rows back
 * can exceed the cap at the loading edge, so pages are dropped there too
 * and the tracker is rewound to the dropped page's request, so the next
 * scroll that way loads it again. At least one page is always kept, so
 * the list can hold up to a page more than maxRows.
 *
 * Dropping rows at the top keeps the viewport on the same content by
 * moving the scroll offset up by the removed height.
 *
 * Limitations:
 * - Lists with a row divider are not windowed (a warning is logged).
 * - While the newest rows are dropped, fetchNew() is skipped: the newest
 *   rows come back through the re-fetch when the user scrolls back.
 * - Restored pages are deduplicated by key. With offset pagination,
 *   rows added on the server while rows were dropped can shift page
 *   boundaries; cursor pagination repeats pages exactly.
 *
 * @class
 */
export class RowWindow
{
	/**
	 * @param {number} maxRows
	 * @param {string} direction - 'down' or 'up'.
	 * @param {HTMLElement|globalThis} container - The scroll container.
	 * @param {PaginationTracker} tracker
	 * @param {function} fetchCallback
	 */
	constructor(maxRows, direction, container, tracker, fetchCallback)
	{
		this.maxRows = maxRows;
		this.isUp = (direction === 'up');
		this.container = container;
		this.tracker = tracker;
		this.fetchCallback = fetchCallback;

		/**
		 * The pages in the list, newest first.
		 *
		 * @type {Array<WindowPage>}
		 */
		this.pages = [];

		/**
		 * The newest-end pages that were dropped. The page next to the
		 * kept rows is last.
		 *
		 * @type {Array<WindowPage>}
		 */
		this.trimmed = [];

		this.resets = tracker.resets;
		this.warned = false;
	}

	/**
	 * Creates a row window, or returns null when maxRows is not a
	 * positive number (windowing off).
	 *
	 * @param {*} maxRows
	 * @param {string} direction
	 * @param {HTMLElement|globalThis} container
	 * @param {PaginationTracker} tracker
	 * @param {function} fetchCallback
	 * @returns {RowWindow|null}
	 */
	static create(maxRows, direction, container, tracker, fetchCallback)
	{
		const max = Math.floor(Number(maxRows));
		if (!(max > 0))
		{
			return null;
		}

		return new RowWindow(max, direction, container, tracker, fetchCallback);
	}

	/**
	 * Returns whether the list can be windowed.
	 *
	 * @param {object} list
	 * @returns {boolean}
	 */
	supports(list)
	{
		if (!list || typeof list.trimRows !== 'function' || typeof list.getRows !== 'function')
		{
			return false;
		}

		if (list.rowDivider)
		{
			if (!this.warned)
			{
				this.warned = true;
				console.warn('[organisms] maxRows is not supported on lists with a divider. Rows will not be trimmed.');
			}
			return false;
		}

		return true;
	}

	/**
	 * Returns the rows the recorded pages hold.
	 *
	 * @returns {number}
	 */
	total()
	{
		let total = 0;
		for (const page of this.pages)
		{
			total += page.count;
		}
		return total;
	}

	/**
	 * Forgets every page once the tracker has been reset (refresh,
	 * clear, remount): the rows no longer match the recorded requests.
	 *
	 * @returns {void}
	 */
	checkReset()
	{
		if (this.tracker.resets === this.resets)
		{
			return;
		}

		this.resets = this.tracker.resets;
		this.pages = [];
		this.trimmed = [];
	}

	/**
	 * Returns whether dropped newest rows are waiting to be re-fetched.
	 *
	 * @returns {boolean}
	 */
	hasTrimmed()
	{
		this.checkReset();
		return (this.trimmed.length > 0);
	}

	/**
	 * Brings the recorded row count in line with the list.
	 *
	 * Rows can arrive outside the recorded pages (fetchNew, a manual
	 * append, resumed rows) or be deleted. Rows the ledger has never
	 * seen become one page from the newest end; other differences are
	 * booked against the newest pages.
	 *
	 * @param {object} list
	 * @param {number} [pending=0] - Rows just added that the caller is about to record.
	 * @returns {void}
	 */
	reconcile(list, pending = 0)
	{
		this.checkReset();

		const total = list.getRows().length - pending;
		if (total <= 0)
		{
			this.pages = [];
			this.trimmed = [];
			return;
		}

		let diff = total - this.total();
		if (diff === 0)
		{
			return;
		}

		if (this.pages.length === 0)
		{
			this.trimmed = [];
			this.pages.push({ offset: this.tracker.initialOffset, cursor: null, count: total });
			return;
		}

		if (diff > 0)
		{
			this.pages[0].count += diff;
			return;
		}

		for (let i = 0; i < this.pages.length && diff < 0; i++)
		{
			const take = Math.min(this.pages[i].count, -diff);
			this.pages[i].count -= take;
			diff += take;
		}
		this.pages = this.pages.filter((page) => page.count > 0);
	}

	/**
	 * Records a page that landed at the loading edge and drops the
	 * newest pages beyond maxRows.
	 *
	 * @param {object} list
	 * @param {{ offset: number, cursor: * }} request - The tracker state the page was requested with.
	 * @param {number} count - The rows the page added.
	 * @returns {void}
	 */
	record(list, request, count)
	{
		if (!(count > 0) || !this.supports(list))
		{
			return;
		}

		this.reconcile(list, count);
		this.pages.push({ offset: request.offset, cursor: request.cursor, count });

		while (this.total() > this.maxRows && this.pages.length > 1)
		{
			const page = this.pages.shift();
			// The newest rows are at the top of a 'down' list.
			this.trim(list, page.count, !this.isUp);
			this.trimmed.push(page);
		}
	}

	/**
	 * Removes rows from one end, keeping the viewport on the same
	 * content when the rows above it are removed.
	 *
	 * @param {object} list
	 * @param {number} count
	 * @param {boolean} fromStart
	 * @returns {void}
	 */
	trim(list, count, fromStart)
	{
		const before = (fromStart)? getScrollMetrics(this.container) : null;
		list.trimRows(count, fromStart);
		if (!before)
		{
			return;
		}

		const after = getScrollMetrics(this.container);
		const removed = before.scrollHeight - after.scrollHeight;
		if (removed > 0)
		{
			setScrollTop(this.container, Math.max(0, before.scrollTop - removed));
		}
	}

	/**
	 * Returns whether the viewport is within the threshold of the edge
	 * the newest rows were dropped from.
	 *
	 * @param {object} metrics
	 * @param {number|function|null} [threshold]
	 * @returns {boolean}
	 */
	isNearTrimmedEdge(metrics, threshold)
	{
		return (this.isUp)? shouldLoadMore(metrics, threshold) : shouldLoadAtTop(metrics, threshold);
	}

	/**
	 * Re-fetches the dropped page next to the kept rows and puts it back.
	 * Shares the tracker's loading flag with the regular loads so only
	 * one request runs at a time.
	 *
	 * @param {object} list
	 * @returns {boolean} Whether a request was issued.
	 */
	restore(list)
	{
		const tracker = this.tracker;
		if (tracker.loading || !this.hasTrimmed() || !this.supports(list))
		{
			return false;
		}

		this.reconcile(list);
		const page = this.trimmed[this.trimmed.length - 1];
		if (!page)
		{
			return false;
		}

		tracker.loading = true;
		const generation = tracker.generation;

		/**
		 * Repeat the page's original request on a separate tracker so
		 * the live one keeps its position at the loading edge.
		 */
		const request = new PaginationTracker(tracker.initialOffset, page.count);
		request.currentOffset = page.offset;
		request.lastCursor = page.cursor;
		request.newestId = tracker.newestId;

		invokeFetch(this.fetchCallback, request, (rows, lastCursor, failed = false) =>
		{
			if (!tracker.isCurrent(generation))
			{
				return;
			}

			// Keep the page on the stack so the next scroll retries it.
			if (failed === true)
			{
				tracker.loading = false;
				return;
			}

			this.trimmed.pop();
			this.putBack(list, page, Array.isArray(rows)? rows : []);
			this.trimLoadingEdge(list);
			tracker.loading = false;
		}, () =>
		{
			if (tracker.isCurrent(generation))
			{
				tracker.loading = false;
			}
		});

		return true;
	}

	/**
	 * Inserts a re-fetched page at the newest end in the order it was
	 * shown before it was dropped.
	 *
	 * @param {object} list
	 * @param {WindowPage} page
	 * @param {Array<object>} rows
	 * @returns {void}
	 */
	putBack(list, page, rows)
	{
		const key = list.key;
		const fresh = (key && typeof list.findIndexByKey === 'function')
			? rows.filter((row) => row && list.findIndexByKey(row[key]) === -1)
			: rows;

		if (fresh.length === 0)
		{
			return;
		}

		/**
		 * A 'down' page was appended in response order and goes back on
		 * top: prepend() reverses its batch, so it gets the rows reversed.
		 * An 'up' page was prepended (shown reversed) and goes back at
		 * the bottom in that shown order.
		 */
		const ordered = fresh.slice().reverse();
		if (this.isUp)
		{
			list.append(ordered);
		}
		else
		{
			const before = getScrollMetrics(this.container);
			list.prepend(ordered);
			const after = getScrollMetrics(this.container);
			const added = after.scrollHeight - before.scrollHeight;
			if (added > 0)
			{
				setScrollTop(this.container, before.scrollTop + added);
			}
		}

		this.pages.unshift({ offset: page.offset, cursor: page.cursor, count: fresh.length });
	}

	/**
	 * Drops pages at the loading edge beyond maxRows and rewinds the
	 * tracker to the oldest dropped page so scrolling that way loads it
	 * again.
	 *
	 * @param {object} list
	 * @returns {void}
	 */
	trimLoadingEdge(list)
	{
		const tracker = this.tracker;
		while (this.total() > this.maxRows && this.pages.length > 1)
		{
			const page = this.pages.pop();
			// The loading edge is the top of an 'up' list.
			this.trim(list, page.count, this.isUp);

			tracker.currentOffset = page.offset;
			tracker.lastCursor = page.cursor;
			tracker.hasMoreData = true;
		}
	}
}

export default RowWindow;
