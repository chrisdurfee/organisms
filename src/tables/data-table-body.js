import { Tbody } from '@base-framework/atoms';
import { PaginationTracker } from '../lists/pagination-tracker.js';
import { fetchAndRefresh, setupFetchCallback } from '../lists/scroll-utils.js';
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
 * @property {string} [props.containerClass] - The class to add to the scroll container.
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
		this.fetchCallback = this.loadMoreItems || setupFetchCallback(this.tableData);
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
				this.refresh();
			},

			for: ['items', rowCallBack]
		});
	}
};

export default DataTableBody;