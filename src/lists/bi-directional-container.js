import { Div } from "@base-framework/atoms";
import { Atom, Events } from "@base-framework/base";
import { PaginationTracker } from "./pagination-tracker.js";
import { RowWindow } from "./row-window.js";
import { addRefreshMethod, createScrollHandler, getListFromParent, getScrollMetrics, hasResumedRows, invokeFetch, rafThrottle, revalidateResumedRows, setupFetchCallback, setupFetchNewerCallback } from "./scroll-utils.js";

/**
 * How close (px) to the bottom an 'up' list counts as pinned to the
 * newest rows.
 *
 * @type {number}
 */
const PINNED_THRESHOLD = 50;

/**
 * A BiDirectionalContainer component that supports both backward (older) and forward (newer)
 * data fetching using cursor and since pagination. Ideal for chat/message interfaces and activity feeds.
 *
 * Supports two scroll directions:
 * - **"down"** (default): Scrolling down loads older items (appends to bottom), fetchNew() prepends newer items to top
 *   Use for: Activity feeds, news feeds, social media timelines
 * - **"up"**: Scrolling up loads older items (prepends to top), fetchNew() appends newer items to bottom
 *   Use for: Chat/messaging interfaces where newest messages are at bottom
 *
 * Automatic scroll position management for 'up' direction:
 * - Initial load automatically scrolls to bottom (shows newest messages)
 * - Prepending older messages preserves scroll position (prevents jarring jumps)
 * - Exposes scrollToBottom() method for manual control
 *
 * @param {object} props
 * @property {HTMLElement} [props.scrollContainer] - The container element for scroll events. Defaults to globalThis.
 * @property {function} [props.loadMoreItems] - A function to fetch older items (backward pagination using cursor).
 * @property {function} [props.loadNewerItems] - A function to fetch newer items (forward pagination using since).
 * @property {object} [props.data] - The data object containing the xhr method.
 * @property {string} [props.xhrMethod='all'] - The method name to call on data.xhr.
 * @property {number} [props.offset] - The initial offset. Defaults to 0.
 * @property {number} [props.limit] - Number of items to load per batch. Defaults to 20.
 * @property {string} [props.containerClass] - The class to add to the container.
 * @property {string} [props.scrollDirection='down'] - Scroll direction: 'down' (scroll down for older) or 'up' (scroll up for older).
 * @property {number|function} [props.loadMoreThreshold] - Distance (px) from the trigger edge
 *   at which to prefetch the next page. Pass a number for a fixed value or a function
 *   `(metrics) => pixels` for dynamic sizing. Defaults to one viewport height so new
 *   items typically render before the user reaches the edge (standard prefetch UX).
 * @property {string} [props.listCache] - The list cache name to use.
 * @property {number} [props.revalidateLimit] - The most resumed rows one revalidation request
 *   covers when a persisted list resumes. Defaults to max(limit, 50); rows beyond it stay as-is.
 * @property {number} [props.maxRows] - Caps the rows kept in the list (unlimited by default).
 *   When a page loaded by scrolling pushes the list past the cap, whole pages are dropped
 *   from the opposite end (the top for 'down', the bottom for 'up'); scrolling back to
 *   that end re-fetches them with the request that first loaded them, and the loading end
 *   is trimmed and rewound in turn. Dropping rows above the viewport moves the scroll
 *   offset by the removed height so the content does not jump. At least one page is kept,
 *   so the list can briefly hold up to a page more than the cap; use a cap worth several
 *   viewports of rows. While the newest rows are dropped, fetchNew() is skipped. Lists with
 *   a divider are not trimmed. See RowWindow for the details.
 * @param {Array<any>} children - The child elements to render.
 * @returns {object}
 *
 * @example
 * // Activity feed (scroll down for older, new items at top)
 * const ActivityFeed = (userId, onSetup) => BiDirectionalContainer({
 *   scrollDirection: 'down', // default
 *   loadMoreItems: async (tracker, callback) => {
 *     const response = await fetch(`/activities?cursor=${tracker.lastCursor}&limit=${tracker.limit}`);
 *     const data = await response.json();
 *     callback(data.items, data.lastCursor);
 *   },
 *   loadNewerItems: async (tracker, callback) => {
 *     const response = await fetch(`/activities?since=${tracker.newestId}&limit=${tracker.limit}`);
 *     const data = await response.json();
 *     callback(data.items, data.items[0]?.id);
 *   },
 *   limit: 20
 * }, [
 *   new List({
 *     items: [],
 *     rowItem: (activity) => ActivityRow(activity),
 *     onCreated: (ele, parent) => {
 *       if (onSetup) onSetup(parent.list);
 *     }
 *   })
 * ]);
 *
 * @example
 * // Chat conversation (scroll up for older, new messages at bottom)
 * const MessageList = (conversationId, onSetup) => BiDirectionalContainer({
 *   scrollDirection: 'up',
 *   loadMoreItems: async (tracker, callback) => {
 *     const response = await fetch(`/messages?cursor=${tracker.lastCursor}&limit=${tracker.limit}`);
 *     const data = await response.json();
 *     callback(data.messages, data.lastCursor);
 *   },
 *   loadNewerItems: async (tracker, callback) => {
 *     const response = await fetch(`/messages?since=${tracker.newestId}&limit=${tracker.limit}`);
 *     const data = await response.json();
 *     callback(data.messages, data.messages[0]?.id);
 *   },
 *   limit: 20
 * }, [
 *   new List({
 *     items: [],
 *     rowItem: (msg) => MessageRow(msg),
 *     onCreated: (ele, parent) => {
 *       if (onSetup) onSetup(parent.list);
 *     }
 *   })
 * ]);
 *
 * // In parent layout (polling controlled externally):
 * let messageList = null;
 * const list = MessageList(123, (ref) => { messageList = ref; });
 * setInterval(() => messageList?.fetchNew(), 3000);
 *
 * @example
 * // Using with data object (backward only)
 * BiDirectionalContainer({
 *   data: conversationData,
 *   limit: 20
 * }, [
 *   new List({ items: [], rowItem: (msg) => MessageRow(msg) })
 * ]);
 */
export const BiDirectionalContainer = Atom((props, children) =>
{
	// @ts-ignore
	const tracker = new PaginationTracker(props.offset, props.limit);
	// @ts-ignore
	const container = props.scrollContainer || globalThis;
	// @ts-ignore
	const scrollDirection = props.scrollDirection || 'down';
	// @ts-ignore
	const fetchCallback = props.loadMoreItems || setupFetchCallback(props.data, props.xhrMethod);

	/**
	 * The key of the registered list, read by the default newer-items
	 * callback so the newest ID is taken from the list's own key.
	 *
	 * @type {string|null}
	 */
	let listKey = null;

	// @ts-ignore
	const fetchNewerCallback = props.loadNewerItems || setupFetchNewerCallback(props.data, props.xhrMethod, () => listKey);

	/**
	 * This will handle the scroll event for loading older items.
	 * Direction determines if we scroll up or down to load older items.
	 *
	 * @param {object|null} e
	 * @param {object} parent
	 * @returns {void}
	 */
	// @ts-ignore
	const rowWindow = RowWindow.create(props.maxRows, scrollDirection, container, tracker, fetchCallback);

	// @ts-ignore
	const handleScroll = createScrollHandler(container, tracker, fetchCallback, scrollDirection, props.listCache, props.loadMoreThreshold, rowWindow);

	/**
	 * The bound listener attached to the scroll container. Attached in
	 * onCreated and removed in onDestroyed using the SAME reference.
	 * The `addEvent` directive cannot be used here: it wraps the callback
	 * to inject the parent, so `Events.off(..., handleScroll)` never
	 * matched the wrapped function and the listener leaked. A leaked
	 * listener from a destroyed list kept fetching page one (its tracker
	 * was re-armed by resetPagination) and appended duplicate rows into
	 * the replacement list registered under the same cache name.
	 *
	 * @type {function|null}
	 */
	let activeScrollListener = null;

	return Div(
		{
			// @ts-ignore
			class: props.containerClass ?? '',

			/**
			 * This will request to update the list when the atom is created.
			 *
			 * @param {object} ele
			 * @param {object} parent
			 * @returns {void}
			 */
			onCreated(ele, parent)
			{
				/**
				 * Attach the scroll listener with a stable reference so
				 * onDestroyed can remove this exact function. It is
				 * coalesced to one call per frame so a fling cannot read
				 * the scroll metrics several times per painted frame.
				 *
				 * A list on a detached keep-alive page ignores scroll
				 * events from the page that is showing, so it never
				 * loads pages while it is out of the document.
				 */
				activeScrollListener = rafThrottle((e) =>
				{
					if (ele.isConnected === false)
					{
						return;
					}
					handleScroll(e, parent);
				});
				Events.on('scroll', container, activeScrollListener, { passive: true });

				// Always start from a clean pagination state on mount. If the
				// Atom closure is reused across navigations the tracker may
				// still hold the offset/cursor from the previous visit, which
				// would cause the initial fetch to continue rather than restart.
				tracker.reset();

				// @ts-ignore
				const list = getListFromParent(parent, props.listCache);
				if (!list)
				{
					return;
				}

				listKey = list.key || null;

				/**
				 * This will add the refresh method to the list.
				 */
				addRefreshMethod(fetchCallback, tracker, list);

				/**
				 * Expose a tracker-only reset so that List components with
				 * persist=true can clear the pagination cursor on destroy
				 * without also wiping the cached item data. This ensures the
				 * next fetch (on resume/recreate) always starts from cursor=null
				 * rather than the last loaded cursor.
				 */
				list.resetPagination = () => tracker.reset();

				/**
				 * Add method to manually fetch newer items (useful for polling).
				 * This should be called via setInterval or other timer mechanism.
				 * The placement of new items depends on scrollDirection:
				 * - 'down': prepends to top (for feeds)
				 * - 'up': appends to bottom (for chat)
				 */
				list.fetchNew = (shouldScroll = false) =>
				{
					// Allow fetching if we're not already loading
					// Don't require hasNewerData to be true (it starts as false)
					if (tracker.loadingNewer)
					{
						return;
					}

					/**
					 * The row window dropped the newest rows; they come
					 * back (with anything newer) when the user scrolls
					 * back to them, and inserting newer rows now would
					 * leave a gap.
					 */
					if (rowWindow && rowWindow.hasTrimmed())
					{
						return;
					}

					/**
					 * When polling without a since-cursor the server may return
					 * rows that are already in the list. Remember this so the
					 * response can be merged (deduped by key) instead of
					 * blindly inserted, which would show duplicate rows.
					 */
					const hadNullCursor = (tracker.newestId === null);

					tracker.loadingNewer = true;
					const generation = tracker.generation;
					invokeFetch(fetchNewerCallback, tracker, (rows, newestId, failed = false) =>
					{
						// A reset or destroy since the request was issued owns
						// the list (and the loading flag) now.
						if (!tracker.isCurrent(generation))
						{
							return;
						}

						if (failed !== true && rows && rows.length > 0)
						{
							const appendNew = (scrollDirection === 'up');
							if (hadNullCursor && list.key)
							{
								// Merge dedupes by key: existing rows are updated
								// in place, only truly new rows are inserted.
								list.merge(rows, appendNew);
							}
							else if (appendNew)
							{
								// Chat: new messages at bottom
								list.append(rows);
							}
							else
							{
								// Feed: new items at top
								list.prepend(rows);
							}

							// Update newest ID tracker if available
							if (newestId !== null)
							{
								tracker.updateNewest(newestId);
							}
						}
						tracker.loadingNewer = false;

						if (shouldScroll && scrollDirection === 'up')
						{
							list.scrollToBottom();
						}
					}, () =>
					{
						if (tracker.isCurrent(generation))
						{
							tracker.loadingNewer = false;
						}
					});
				};

				/**
				 * Add method to reset the tracker and clear all list data
				 * back to the initial state without re-fetching.
				 */
				list.clear = () =>
				{
					tracker.reset();
					list.reset();
				};

				/**
				 * Add method to scroll to bottom (useful for chat interfaces).
				 * This can be called after fetching new messages to keep user at bottom.
				 * Uses onFlush to wait for batched UI updates when available.
				 */
				list.scrollToBottom = () =>
				{
					const scroll = () =>
					{
						if (container === globalThis)
						{
							const scrollHeight = globalThis.document.documentElement.scrollHeight;
							globalThis.scrollTo(0, scrollHeight);
							return;
						}

						// @ts-ignore
						container.scrollTop = container.scrollHeight;
					};

					if (typeof list.onFlush === 'function')
					{
						list.onFlush(scroll);
						return;
					}

					requestAnimationFrame(scroll);
				};

				/**
				 * A persisted list that resumed its rows revalidates them
				 * in place (stale-while-revalidate) instead of resetting to
				 * page one — the resumed rows and scroll position stay put
				 * while one request refreshes the loaded window. Chat-style
				 * 'up' lists are pinned to the newest rows at the bottom,
				 * and stay pinned after the refresh if the user has not
				 * scrolled away in the meantime.
				 */
				if (hasResumedRows(list))
				{
					const isUp = (scrollDirection === 'up');
					if (isUp)
					{
						list.scrollToBottom();
					}

					revalidateResumedRows(fetchCallback, tracker, list, {
						direction: scrollDirection,
						// @ts-ignore
						revalidateLimit: props.revalidateLimit,
						onApply: (!isUp)? null : (apply) =>
						{
							const metrics = getScrollMetrics(container);
							const pinned = (metrics.scrollTop + metrics.clientHeight >= metrics.scrollHeight - PINNED_THRESHOLD);
							apply();
							if (pinned)
							{
								list.scrollToBottom();
							}
						}
					});
					return;
				}

				/**
				 * This will request the first fetch. This runs after all list
				 * methods are attached so a synchronously-resolving fetch can
				 * safely call scrollToBottom(). The scroll handler sets
				 * tracker.newestId from the initial page for both directions,
				 * so fetchNew() never has to poll with a null cursor.
				 */
				handleScroll(null, parent, () =>
				{
					list.reset();

					// For 'up' direction (chat), keep the view pinned to the
					// newest messages at the bottom after the initial load.
					if (scrollDirection === 'up')
					{
						list.scrollToBottom();
					}
				});
			},

			/**
			 * This will remove the scroll event from the container when the atom is destroyed.
			 *
			 * @returns {void}
			 */
			onDestroyed()
			{
				/**
				 * Drop any request still in flight so a late response cannot
				 * land in a list registered later under the same cache name.
				 */
				tracker.cancel();

				/**
				 * This will remove the scroll event when the atom is destroyed.
				 */
				if (activeScrollListener)
				{
					// @ts-ignore
					activeScrollListener.cancel();
					Events.off('scroll', container, activeScrollListener);
					activeScrollListener = null;
				}
			}
		},
		children
	);
});

export default BiDirectionalContainer;
