import { Div } from "@base-framework/atoms";
import { Atom, Events } from "@base-framework/base";
import { PaginationTracker } from "./pagination-tracker.js";
import { addRefreshMethod, createScrollHandler, getListFromParent, setupFetchCallback } from "./scroll-utils.js";

/**
 * A ScrollableList component that updates when its container is scrolled.
 *
 * @param {object} props
 * @property {HTMLElement} [props.scrollContainer] - The container element for scroll events. Defaults to globalThis.
 * @property {function} [props.loadMoreItems] - A function to fetch/generate additional items.
 * @property {object} [props.data] - The data object containing the xhr method.
 * @property {number} [props.offset] - The initial offset. Defaults to 0.
 * @property {number} [props.limit] - Number of items to load per batch. Defaults to 20.
 * @property {number|function} [props.loadMoreThreshold] - Distance (px) from the bottom
 *   at which to prefetch the next page. Pass a number for a fixed value or a function
 *   `(metrics) => pixels` for dynamic sizing. Defaults to one viewport height so new
 *   items typically render before the user reaches the bottom (standard prefetch UX).
 * @property {string} [props.containerClass] - The class to add to the scroll container.
 * @property {string} [props.listCache] - The list cache name to use.
 * @param {array} children - The child elements to render.
 * @returns {object}
 */
export const ScrollableContainer = Atom((props, children) =>
{
	// @ts-ignore
	const tracker = new PaginationTracker(props.offset, props.limit);
	// @ts-ignore
	const container = props.scrollContainer || globalThis;
	// @ts-ignore
	const fetchCallback = props.loadMoreItems || setupFetchCallback(props.data);

	/**
	 * This will handle the scroll event.
	 *
	 * @param {object|null} e
	 * @param {object} parent
	 * @returns {void}
	 */
	// @ts-ignore
	const handleScroll = createScrollHandler(container, tracker, fetchCallback, 'down', props.listCache, props.loadMoreThreshold);

	/**
	 * The bound listener attached to the scroll container. Attached in
	 * onCreated and removed in onDestroyed using the SAME reference —
	 * the `addEvent` directive wraps the callback to inject the parent,
	 * which breaks Events.off matching and leaks the listener.
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
				 * onDestroyed can remove this exact function.
				 */
				activeScrollListener = (e) => handleScroll(e, parent);
				Events.on('scroll', container, activeScrollListener, { passive: true });

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
				 * without also wiping the cached item data.
				 */
				list.resetPagination = () => tracker.reset();

				/**
				 * This will request the first fetch.
				 */
				handleScroll(null, parent, () =>
				{
					list.reset();
				});
			},

			/**
			 * This will remove the scroll event when the atom is destroyed.
			 *
			 * @param {object} ele
			 * @param {object} parent
			 */
			onDestroyed(ele, parent)
			{
				/**
				 * This will remove the scroll event when the atom is destroyed.
				 */
				if (activeScrollListener)
				{
					Events.off('scroll', container, activeScrollListener);
					activeScrollListener = null;
				}
			}
		},
		children
	);
});

export default ScrollableContainer;