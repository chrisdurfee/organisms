import { Tbody } from '@base-framework/atoms';
import { Data } from '@base-framework/base';
import { List } from '../lists/list.js';
import { SkeletonTableRow } from './skeleton-table-row.js';

/**
 * TableBody
 *
 * This will create a table body component with skeleton support.
 *
 * @param {object} props
 * @property {string} class - The class to add to the list
 * @property {string} key - The key to use to identify the items
 * @property {array} [items] - The items
 * @property {boolean|object} [skeleton] - Skeleton configuration. Can be true for default or object with { number: 5, row: customRowFunction }
 * @property {number} [columnCount] - Number of columns for skeleton rows (auto-detected from headers if not provided)
 *
 * @class TableBody
 * @extends List
 */
// @ts-ignore
export class TableBody extends List
{
	/**
	 * This will set the default data.
	 *
	 * @returns {Data}
	 */
	setData()
	{
		// @ts-ignore
		const hasItems = this.items && this.items.length > 0;
		// @ts-ignore
		const isSkeletonEnabled = this.skeleton && !hasItems;
		if (isSkeletonEnabled)
		{
			// Create new data with skeleton properties
			return new Data({
				items: this.generateSkeletonRows(),
				hasItems: true, // Show skeleton as if we have items
				showSkeleton: true
			});
		}

		// @ts-ignore
		return super.setData();
	}

	/**
	 * Generates skeleton rows for the table.
	 *
	 * @returns {Array}
	 */
	generateSkeletonRows()
	{
		// @ts-ignore
		const skeletonConfig = this.skeleton;

		// Default skeleton configuration
		let skeletonCount = 5;
		let customRowFunction = null;

		// Handle skeleton configuration
		if (typeof skeletonConfig === 'object')
		{
			skeletonCount = skeletonConfig.number || 5;
			customRowFunction = skeletonConfig.row || null;
		}

		// Calculate column count from columnCount prop or default to 3
		// @ts-ignore
		const columnCount = this.columnCount || 3;

		// Generate skeleton rows
		return Array.from({ length: skeletonCount }, (_, index) =>
		{
			if (customRowFunction && typeof customRowFunction === 'function')
			{
				return customRowFunction(index, columnCount);
			}

			return SkeletonTableRow({
				columnCount,
				key: `skeleton-${index}`
			});
		});
	}

	/**
	 * Removes skeleton rows and shows real content.
	 *
	 * @returns {void}
	 */
	removeSkeleton()
	{
		// @ts-ignore
		if (this.data.get('showSkeleton'))
		{
			// @ts-ignore
			this.data.set('showSkeleton', false);
			// @ts-ignore
			this.data.set('items', this.items || []);
		}
	}

	/**
	 * Override setRows to remove skeleton when real data arrives
	 *
	 * @param {array} rows
	 * @returns {void}
	 */
	setRows(rows)
	{
		// Remove skeleton when setting real rows
		this.removeSkeleton();
		// @ts-ignore
		super.setRows(rows);
	}

	/**
	 * Override append to remove skeleton when real data arrives
	 *
	 * @param {array|object} items
	 * @returns {void}
	 */
	append(items)
	{
		// Remove skeleton when appending real items
		this.removeSkeleton();
		// @ts-ignore
		super.append(items);
	}

	/**
	 * Override prepend to remove skeleton when real data arrives
	 *
	 * @param {array|object} items
	 * @returns {void}
	 */
	prepend(items)
	{
		// Remove skeleton when prepending real items
		this.removeSkeleton();
		// @ts-ignore
		super.prepend(items);
	}

	/**
	 * This will create a row for each item.
	 * Override to handle skeleton items differently from real data items.
	 *
	 * @param {*} item
	 * @param {*} index
	 * @param {*} scope
	 * @param {*} children
	 * @returns {object|null}
	 */
	row(item, index, scope, children)
	{
		// If this is a skeleton item (already a component), return it directly
		// @ts-ignore
		if (this.data && this.data.get('showSkeleton'))
		{
			return item;
		}

		// For real data items, use the normal row processing
		// @ts-ignore
		return super.row(item, index, scope, children);
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

		return Tbody({
			onCreated: (ele) =>
			{
				// @ts-ignore
				this.cacheEle(ele, 'listContainer');
			},
			// @ts-ignore
			class: `tbody ${this.class || ''}`,
			for: ['items', rowCallBack]
		});
	}

	/**
	 * Called when the component is destroyed.
	 *
	 * @public
	 * @return {void}
	 */
	beforeDestroy()
	{
		// @ts-ignore
		super.beforeDestroy();
	}
};