import { Tbody } from '@base-framework/atoms';
import { PaginationTracker } from '../lists/pagination-tracker.js';
import { fetchAndRefresh, hasResumedRows, revalidateResumedRows, setupFetchCallback } from '../lists/scroll-utils.js';
import { TableBody } from './table-body.js';

/**
 * A DataTableBody component that handles data fetching and rendering for a table body.
 *
 * @param {object} props
 * @property {function} [props.loadMoreItems] - A function to fetch/generate additional items.
 * @property {number} [props.offset] - The initial offset. Defaults to 0.
 * @property {number} [props.limit] - Number of items to load per batch. Defaults to 20.
 * @property {string} [props.class] - The class to add to the list.
 * @property {string} [props.key] - The key to use to identify the items.
 * @property {Array<object>} [props.items] - The initial items.
 * @property {function} [props.rowItem] - The row item.
 * @property {object} [props.tableData] - The data object containing the xhr method.
 * @property {string} [props.xhrMethod='all'] - The method name to call on tableData.xhr.
 * @property {string} [props.containerClass] - The class to add to the scroll container.
 * @property {number} [props.revalidateLimit] - The most resumed rows one revalidation request
 *   covers when a persisted body resumes. Defaults to max(limit, 50); rows beyond it stay as-is.
 * @property {function} [props.emptyState] - Returns the layout shown in a full-width row when
 *   the loaded body has no rows.
 * @property {boolean} [props.clone=true] - Deep-copies every batch of rows (the default). Pass
 *   `false` to use the row objects as given; the caller must not mutate them afterwards.
 *
 * @class DataTableBody
 * @extends TableBody
 */
export class DataTableBody extends TableBody
{
	/**
	 * This will declare the component props.
	 *
	 * @returns {void}
	 */
	declareProps()
	{
		/**
		 * @member {PaginationTracker}
		 */
		this.tracker = null;

		/**
		 * @member {function}
		 */
		this.fetchCallback = null;
	}

	/**
	 * This will set up the page tracker.
	 *
	 * @returns {PaginationTracker}
	 */
	setupPageTracker()
	{
		// @ts-ignore
		return this.tracker = new PaginationTracker(this.offset, this.limit);
	}

	/**
	 * This will set up the fetch callback.
	 *
	 * @returns {void}
	 */
	setupFetchCallback()
	{
		// @ts-ignore
		this.setupPageTracker();
		// @ts-ignore
		this.fetchCallback = this.loadMoreItems || setupFetchCallback(this.tableData, this.xhrMethod);
	}

	/**
	 * Resets only the pagination tracker without clearing item data.
	 * Called automatically by List.destroy() when persist=true so the
	 * next fetch always starts from cursor=null on resume.
	 *
	 * @returns {void}
	 */
	resetPagination()
	{
		// @ts-ignore
		if (this.tracker)
		{
			// @ts-ignore
			this.tracker.reset();
		}
	}

	/**
	 * This will refresh the list.
	 *
	 * @returns {void}
	 */
	refresh()
	{
		// @ts-ignore
		fetchAndRefresh(this.fetchCallback, this.tracker, this);
	}

	/**
	 * This will render the list.
	 *
	 * @returns {object}
	 */
	render()
	{
		// @ts-ignore
		const rowCallBack = this.row.bind(this);
		// @ts-ignore
		this.setupFetchCallback();

		/**
		 * The empty state waits for the first response so a body that is
		 * still loading never shows it.
		 */
		// @ts-ignore
		this.awaitingData = true;

		return Tbody({
			// @ts-ignore
			class: `tbody ${this.class || ''}`,

			/**
			 * This will request to update the list when the atom is created.
			 *
			 * @param {object} ele
			 * @param {object} parent
			 * @returns {void}
			 */
			onCreated: (ele, parent) =>
			{
				// @ts-ignore
				this.cacheEle(ele, 'listContainer');

				/**
				 * A persisted body that resumed its rows revalidates them
				 * in place instead of resetting to page one, so the rows
				 * never flash and the table keeps its height.
				 */
				if (hasResumedRows(this))
				{
					// @ts-ignore
					revalidateResumedRows(this.fetchCallback, this.tracker, this, { revalidateLimit: this.revalidateLimit });
					return;
				}

				this.refresh();
			},

			/**
			 * Drops any request still in flight so a late response is never
			 * applied to the destroyed table body.
			 *
			 * @returns {void}
			 */
			onDestroyed: () =>
			{
				// @ts-ignore
				if (this.tracker)
				{
					// @ts-ignore
					this.tracker.cancel();
				}
			},

			/**
			 * The explicit-data form with scope=false skips the per-row
			 * scoped Data allocation that row() never uses. See TableBody.
			 */
			// @ts-ignore
			for: [this.data, 'items', rowCallBack, false],

			/**
			 * Declared after for: so the rows are built before the empty
			 * state row is placed.
			 */
			onSet: this.getEmptyStateWatcher()
		});
	}
};

export default DataTableBody;