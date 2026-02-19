import { Div } from "@base-framework/atoms";
import { Atom } from "@base-framework/base";
import { PaginationTracker } from "./pagination-tracker.js";
import { createScrollHandler, fetchAndRefresh, getNewestId, setupFetchCallback, setupFetchNewerCallback } from "./scroll-utils.js";

/**
 * This will reset the tracker and fetch new data.
 *
 * @param {Function} fetchCallback
 * @param {PaginationTracker} tracker
 * @param {object} list
 * @returns {Function}
 */
const setupResetCallback = (fetchCallback, tracker, list) =>
{
	return () =>
	{
		fetchAndRefresh(fetchCallback, tracker, list);
	};
};

/**
 * This will add the refresh method to the list.
 *
 * @param {Function} fetchCallback
 * @param {PaginationTracker} tracker
 * @param {object} parent
 * @param {string} listCache
 */
const addRefreshMethod = (fetchCallback, tracker, parent, listCache) =>
{
	parent[listCache].refresh = setupResetCallback(fetchCallback, tracker, parent[listCache]);
};

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
 * @property {number} [props.offset] - The initial offset. Defaults to 0.
 * @property {number} [props.limit] - Number of items to load per batch. Defaults to 20.
 * @property {string} [props.containerClass] - The class to add to the container.
 * @property {string} [props.scrollDirection='down'] - Scroll direction: 'down' (scroll down for older) or 'up' (scroll up for older).
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
	const fetchCallback = props.loadMoreItems || setupFetchCallback(props.data);
	// @ts-ignore
	const fetchNewerCallback = props.loadNewerItems || setupFetchNewerCallback(props.data);

	/**
	 * This will handle the scroll event for loading older items.
	 * Direction determines if we scroll up or down to load older items.
	 *
	 * @param {object|null} e
	 * @param {object} parent
	 * @returns {void}
	 */
	// @ts-ignore
	const handleScroll = createScrollHandler(container, tracker, fetchCallback, scrollDirection, props.listCache);

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
				 * This will add the refresh method to the list.
				 */
				// @ts-ignore
				addRefreshMethod(fetchCallback, tracker, parent, props.listCache);

				/**
				 * This will request the first fetch.
				 */
				handleScroll(null, parent, () =>
				{
					// @ts-ignore
					const list = parent[props.listCache];
					list.reset();

					// For 'up' direction (chat), ensure newestId is set from the loaded items
					if (scrollDirection === 'up')
					{
						// Get the newest ID by detecting sort order
						const items = list.data?.items || list.data?.rows || [];
						if (tracker.newestId === null)
						{
							const newestId = getNewestId(items);
							if (newestId !== null)
							{
								tracker.updateNewest(newestId);
							}
						}

						list.scrollToBottom();
					}
				});

				// @ts-ignore
				const list = parent[props.listCache];

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
					if (!tracker.loadingNewer)
					{
						tracker.loadingNewer = true;
						fetchNewerCallback(tracker, (rows, newestId) =>
						{
							if (rows && rows.length > 0)
							{
								// Direction determines where to add new items
								if (scrollDirection === 'up')
								{
									// Chat: new messages at bottom
									// Use append instead of updateRows to avoid affecting pagination tracker
									list.append(rows);
								}
								else
								{
									// Feed: new items at top
									// Use prepend instead of prependRows to avoid affecting pagination tracker
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
						});
					}
				};

				/**
				 * Add method to scroll to bottom (useful for chat interfaces).
				 * This can be called after fetching new messages to keep user at bottom.
				 * Uses onFlush to wait for batched UI updates.
				 */
				list.scrollToBottom = () =>
				{
					list.onFlush(() =>
					{
						if (container === globalThis)
						{
							const scrollHeight = globalThis.document.documentElement.scrollHeight;
							globalThis.scrollTo(0, scrollHeight);
							return;
						}

						// @ts-ignore
						container.scrollTop = container.scrollHeight;
					});
				};
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
