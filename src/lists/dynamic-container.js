import { Div } from "@base-framework/atoms";
import { Atom } from "@base-framework/base";
import { PaginationTracker } from "./pagination-tracker.js";
import { addRefreshMethod, getListFromParent, hasResumedRows, revalidateResumedRows, setupFetchCallback } from "./scroll-utils.js";

/**
 * A DynamicContainer component that updates the data by fetching more items.
 *
 * It does not listen for scroll events: the first page is fetched on
 * create and further loads happen through `list.refresh()`. Use
 * ScrollableContainer for scroll-driven pagination.
 *
 * @param {object} props
 * @property {function} [props.loadMoreItems] - A function to fetch/generate additional items.
 * @property {object} [props.data] - The data object containing the xhr method.
 * @property {string} [props.xhrMethod='all'] - The method name to call on data.xhr.
 * @property {number} [props.offset] - The initial offset. Defaults to 0.
 * @property {number} [props.limit] - Number of items to load per batch. Defaults to 20.
 * @property {string} [props.containerClass] - The class to add to the scroll container.
 * @property {string} [props.listCache] - The list cache name to use.
 * @property {number} [props.revalidateLimit] - The most resumed rows one revalidation request
 *   covers when a persisted list resumes. Defaults to max(limit, 50); rows beyond it stay as-is.
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
				 * A persisted list that resumed its rows revalidates them in
				 * place instead of resetting to page one, so the resumed rows
				 * never flash.
				 */
				if (hasResumedRows(list))
				{
					// @ts-ignore
					revalidateResumedRows(fetchCallback, tracker, list, { revalidateLimit: props.revalidateLimit });
					return;
				}

				/**
				 * Run the initial fetch (resets the tracker, clears the list,
				 * and loads the first page) so DynamicList behaves consistently
				 * with DataList instead of rendering an empty list.
				 */
				list.refresh();
			},

			/**
			 * Drops any request still in flight so a late response is never
			 * applied once the container is gone.
			 *
			 * @returns {void}
			 */
			onDestroyed()
			{
				tracker.cancel();
			}
		},
		children
	);
});

export default DynamicContainer;