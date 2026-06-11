import { Div } from "@base-framework/atoms";
import { Atom, Events } from "@base-framework/base";
import { PaginationTracker } from "./pagination-tracker.js";
import { addRefreshMethod, createScrollHandler, getListFromParent, invokeFetch, setupFetchCallback, setupFetchNewerCallback } from "./scroll-utils.js";

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
	// @ts-ignore
	const fetchNewerCallback = props.loadNewerItems || setupFetchNewerCallback(props.data, props.xhrMethod);

	/**
	 * This will handle the scroll event for loading older items.
	 * Direction determines if we scroll up or down to load older items.
	 *
	 * @param {object|null} e
	 * @param {object} parent
	 * @returns {void}
	 */
	// @ts-ignore
	const handleScroll = createScrollHandler(container, tracker, fetchCallback, scrollDirection, props.listCache, props.loadMoreThreshold);

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
					 * When polling without a since-cursor the server may return
					 * rows that are already in the list. Remember this so the
					 * response can be merged (deduped by key) instead of
					 * blindly inserted, which would show duplicate rows.
					 */
					const hadNullCursor = (tracker.newestId === null);

					tracker.loadingNewer = true;
					invokeFetch(fetchNewerCallback, tracker, (rows, newestId) =>
					{
						if (rows && rows.length > 0)
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
						tracker.loadingNewer = false;
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
				 * This will remove the scroll event when the atom is destroyed.
				 */
				Events.off('scroll', container, handleScroll);
			},

			/**
			 * This will add the scroll event to the container for loading older items.
			 */
			addEvent: ['scroll', container, handleScroll, { passive: true }],
		},
		children
	);
});

export default BiDirectionalContainer;
