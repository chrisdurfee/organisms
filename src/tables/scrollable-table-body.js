import { Tbody } from '@base-framework/atoms';
import { PaginationTracker } from '../lists/pagination-tracker.js';
import { createTableScrollHandler, setupFetchCallback } from '../lists/scroll-utils.js';
import { TableBody } from './table-body.js';

/**
 * A ScrollableTableBody component that updates when its container is scrolled.
 *
 * @param {object} props
 * @property {HTMLElement} [props.scrollContainer] - The container element for scroll events. Defaults to window.
 * @property {function} [props.loadMoreItems] - A function to fetch/generate additional items.
 * @property {number} [props.offset] - The initial offset. Defaults to 0.
 * @property {number} [props.limit] - Number of items to load per batch. Defaults to 20.
 * @property {string} [props.class] - The class to add to the list.
 * @property {string} [props.key] - The key to use to identify the items.
 * @property {array} [props.items] - The initial items.
 * @property {function} [props.rowItem] - The row item.
 * @property {object} [props.tableData] - The data object containing the xhr method.
 * @property {string} [props.containerClass] - The class to add to the scroll container.
 *
 * @class ScrollableTableBody
 * @extends TableBody
 */
export class ScrollableTableBody extends TableBody
{
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
		const tracker = new PaginationTracker(this.offset, this.limit);
		// @ts-ignore
		const container = this.scrollContainer || window;
		// @ts-ignore
		const fetchCallback = this.loadMoreItems || setupFetchCallback(this.tableData);

		/**
		 * This will handle the scroll event.
		 *
		 * @param {object|null} e
		 * @param {object} parent
		 * @returns {void}
		 */
		const handleScroll = createTableScrollHandler(container, tracker, fetchCallback);

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
			onCreated(ele, parent)
			{
				handleScroll(null, parent);
			},

			/**
			 * This will add the scroll event to the container.
			 */
			addEvent: ['scroll', container, handleScroll, { passive: true }],

			for: ['items', rowCallBack]
		});
	}
};

export default ScrollableTableBody;