import { Div } from "@base-framework/atoms";
import { Atom } from "@base-framework/base";
import { PaginationTracker } from "./pagination-tracker.js";
import { createScrollHandler, fetchAndUpdate, setupFetchCallback } from "./scroll-utils.js";

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
		tracker.reset();
		fetchAndUpdate(fetchCallback, tracker, list);
	};
};

/**
 * This will add the refresh method to the list.
 *
 * @param {Function} fetchCallback
 * @param {PaginationTracker} tracker
 * @param {object} parent
 */
const addRefreshMethod = (fetchCallback, tracker, parent) =>
{
	parent.list.refresh = setupResetCallback(fetchCallback, tracker, parent.list);
};

/**
 * A ScrollableList component that updates when its container is scrolled.
 *
 * @param {object} props
 * @property {HTMLElement} [props.scrollContainer] - The container element for scroll events. Defaults to window.
 * @property {function} [props.loadMoreItems] - A function to fetch/generate additional items.
 * @property {object} [props.data] - The data object containing the xhr method.
 * @property {number} [props.offset] - The initial offset. Defaults to 0.
 * @property {number} [props.limit] - Number of items to load per batch. Defaults to 20.
 * @property {string} [props.containerClass] - The class to add to the scroll container.
 * @param {array} children - The child elements to render.
 * @returns {object}
 */
export const ScrollableContainer = Atom((props, children) =>
{
	const tracker = new PaginationTracker(props.offset, props.limit);
	const container = props.scrollContainer || window;
	const fetchCallback = props.loadMoreItems || setupFetchCallback(props.data);

	/**
	 * This will handle the scroll event.
	 *
	 * @param {object|null} e
	 * @param {object} parent
	 * @returns {void}
	 */
	const handleScroll = createScrollHandler(container, tracker, fetchCallback);

	return Div(
		{
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
				addRefreshMethod(fetchCallback, tracker, parent);

				/**
				 * This will request the first fetch.
				 */
				handleScroll(null, parent);
			},

			/**
			 * This will add the scroll event to the container.
			 */
			addEvent: ['scroll', container, handleScroll, { passive: true }],
		},
		children
	);
});

export default ScrollableContainer;