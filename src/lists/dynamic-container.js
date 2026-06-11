import { Div } from "@base-framework/atoms";
import { Atom } from "@base-framework/base";
import { PaginationTracker } from "./pagination-tracker.js";
import { addRefreshMethod, getListFromParent, setupFetchCallback } from "./scroll-utils.js";

/**
 * A DynamicContainer component that updates the data by fetching more items.
 *
 * @param {object} props
 * @property {HTMLElement} [props.scrollContainer] - The container element for scroll events. Defaults to globalThis.
 * @property {function} [props.loadMoreItems] - A function to fetch/generate additional items.
 * @property {object} [props.data] - The data object containing the xhr method.
 * @property {string} [props.xhrMethod='all'] - The method name to call on data.xhr.
 * @property {number} [props.offset] - The initial offset. Defaults to 0.
 * @property {number} [props.limit] - Number of items to load per batch. Defaults to 20.
 * @property {string} [props.containerClass] - The class to add to the scroll container.
 * @property {string} [props.listCache] - The list cache name to use.
 * @param {Array<any>} children - The child elements to render.
 * @returns {object}
 */
export const DynamicContainer = Atom((props, children) =>
{
	// @ts-ignore
	const tracker = new PaginationTracker(props.offset, props.limit);
	// @ts-ignore
	const fetchCallback = props.loadMoreItems || setupFetchCallback(props.data, props.xhrMethod);

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
				 * Run the initial fetch (resets the tracker, clears the list,
				 * and loads the first page) so DynamicList behaves consistently
				 * with DataList instead of rendering an empty list.
				 */
				list.refresh();
			}
		},
		children
	);
});

export default DynamicContainer;