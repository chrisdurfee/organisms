import { Div } from "@base-framework/atoms";
import { Atom } from "@base-framework/base";
import { PaginationTracker } from "./pagination-tracker.js";
import { fetchAndRefresh, setupFetchCallback } from "./scroll-utils.js";

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
 */
const addRefreshMethod = (fetchCallback, tracker, parent) =>
{
	parent.list.refresh = setupResetCallback(fetchCallback, tracker, parent.list);
};

/**
 * A DynamicContainer component that updates the data by fetching more items.
 *
 * @param {object} props
 * @property {HTMLElement} [props.scrollContainer] - The container element for scroll events. Defaults to globalThis.
 * @property {function} [props.loadMoreItems] - A function to fetch/generate additional items.
 * @property {object} [props.data] - The data object containing the xhr method.
 * @property {number} [props.offset] - The initial offset. Defaults to 0.
 * @property {number} [props.limit] - Number of items to load per batch. Defaults to 20.
 * @property {string} [props.containerClass] - The class to add to the scroll container.
 * @param {array} children - The child elements to render.
 * @returns {object}
 */
export const DynamicContainer = Atom((props, children) =>
{
	const tracker = new PaginationTracker(props.offset, props.limit);
	const fetchCallback = props.loadMoreItems || setupFetchCallback(props.data);

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
			}
		},
		children
	);
});

export default DynamicContainer;