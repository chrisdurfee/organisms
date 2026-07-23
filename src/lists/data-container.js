import { Div } from "@base-framework/atoms";
import { Atom } from "@base-framework/base";
import { PaginationTracker } from "./pagination-tracker.js";
import { addRefreshMethod, getListFromParent, hasResumedRows, revalidateResumedRows, setupFetchCallback } from "./scroll-utils.js";

/**
 * A DataContainer component that updates using the provided data.
 *
 * @param {object} props
 * @property {function} [props.loadMoreItems] - A function to fetch/generate additional items.
 * @property {object} [props.data] - The data object containing the xhr method.
 * @property {string} [props.xhrMethod='all'] - The method name to call on data.xhr.
 * @property {number} [props.offset] - The initial offset. Defaults to 0.
 * @property {number} [props.limit] - Number of items to load per batch. Defaults to 20.
 * @property {string} [props.containerClass] - The class to add to the list container.
 * @property {string} [props.listCache] - The list cache name to use.
 * @param {Array<any>} children - The child elements to render.
 * @returns {object}
 */
export const DataContainer = Atom((props, children) =>
{
	// @ts-ignore
	const tracker = new PaginationTracker(props.offset, props.limit);
	// @ts-ignore
	const fetchCallback = props.loadMoreItems || setupFetchCallback(props.data, props.xhrMethod);

	return Div(
		{
			// @ts-ignore
			class: props.containerClass ?? 'flex flex-col',

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
				 * never flash. Explicit list.refresh() calls from app code
				 * keep the classic reset semantics.
				 */
				if (hasResumedRows(list))
				{
					revalidateResumedRows(fetchCallback, tracker, list);
					return;
				}

				list.refresh();
			}
		},
		children
	);
});

export default DataContainer;