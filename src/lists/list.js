import { Div, On } from '@base-framework/atoms';
import { Component, Data, Jot } from '@base-framework/base';
import { ChildHelper } from 'src/utils/child-helper.js';
import { DataHelper } from 'src/utils/data-helper.js';
import { RowDivider } from './row-divider.js';

/**
 * This will clone the data.
 *
 * @param {*} data
 * @returns {*}
 */
const clone = (data) => JSON.parse(JSON.stringify(data));

/**
 * List
 *
 * This will create a list component.
 *
 * @param {object} props
 * @property {string} class - The class to add to the list
 * @property {string} key - The key to use to identify the items
 * @property {array} [items] - The items
 * @property {object} [emptyState] - The empty state component to show when no items
 * @property {object} [divider] - The divider configuration
 * @property {function} rowItem - Function to render each row item
 *
 * @type {typeof Component}
 */
export const List = Jot(
{
	/**
	 * This will check to set up the row divider.
	 *
	 * @returns {void}
	 */
	onCreated()
	{
		// @ts-ignore
		if (this.divider)
		{
			// @ts-ignore
			this.rowDivider = new RowDivider({ ...this.divider });
		}
	},

	/**
	 * This will set the default data.
	 *
	 * @returns {object}
	 */
	setData()
	{
		// @ts-ignore
		const items = (this.items) ? clone(this.items) : [];
		const hasItems = (Array.isArray(items) && items.length > 0);

		return new Data({
			items,
			hasItems
		});
	},

	/**
	 * This will run before the component is set up.
	 *
	 * @returns {void}
	 */
	before()
	{
		// @ts-ignore
		this.linkParentData();
	},

	/**
	 * This will link the parent data to the list.
	 *
	 * @protected
	 * @returns {void}
	 */
	linkParentData()
	{
		// @ts-ignore
		const parentData = this.parent?.data ?? this.parent?.context?.data ?? null;
		if (parentData)
		{
			// @ts-ignore
			this.data.link(parentData, 'hasItems');
		}
	},

	/**
	 * This will render the list.
	 *
	 * @returns {object}
	 */
	render()
	{
		// @ts-ignore
		const rowCallBack = this.row.bind(this);

		return On('hasItems', (hasItems) =>
		{
			// Show empty state when no items and emptyState is provided
			// @ts-ignore
			if (!hasItems && this.emptyState)
			{
				// @ts-ignore
				return this.emptyState();
			}

			// Show the list with items
			return Div({
				// @ts-ignore
				class: `list ${this.class || ''}`,
				for: ['items', rowCallBack]
			});
		});
	},

	/**
	 * This will create a row for each item.
	 *
	 * @param {*} item
	 * @param {number} index
	 * @param {*} scope
	 * @param {*} children
	 * @returns {object|null}
	 */
	row(item, index, scope, children)
	{
		// @ts-ignore
		if (typeof this.rowItem !== 'function')
		{
			return null;
		}

		// @ts-ignore
		if (this.rowDivider && children)
		{
			// @ts-ignore
			this.rowDivider.append(item, children);
		}

		// @ts-ignore
		return this.rowItem(item, index);
	},

	/**
	 * This will delete an item from the list.
	 *
	 * @public
	 * @param {*} keyValue
	 * @returns {void}
	 */
	delete(keyValue)
	{
		// @ts-ignore
		const index = this.findIndexByKey(keyValue);
		if (index === -1)
		{
			return;
		}

		// @ts-ignore
		this.data.delete(`items[${index}]`);
		// @ts-ignore
		const rowElement = ChildHelper.get(this.panel, index);
		if (rowElement)
		{
			ChildHelper.remove(rowElement);
		}

		// Update hasItems after deletion
		// @ts-ignore
		this.updateHasItems();
	},

	/**
	 * This will replace an item in the list.
	 *
	 * @protected
	 * @param {object} row
	 * @returns {void}
	 */
	replace(row)
	{
		if (row.status === 'unchanged')
		{
			return;
		}

		// @ts-ignore
		const item = row.item;
		if (row.status === 'added')
		{
			// @ts-ignore
			this.append(item);
			return;
		}

		// @ts-ignore
		const keyValue = item[this.key];
		// @ts-ignore
		const index = this.findIndexByKey(keyValue);
		if (index === -1)
		{
			return;
		}

		// @ts-ignore
		this.data.set(`items[${index}]`, item);
		// @ts-ignore
		const oldRow = ChildHelper.get(this.panel, index);
		// @ts-ignore
		const layout = this.row(item, index);
		if (oldRow && layout)
		{
			ChildHelper.replace(layout, oldRow, this);
		}
	},

	/**
	 * This will remove items from the list.
	 *
	 * @public
	 * @param {array} items
	 * @returns {void}
	 */
	remove(items)
	{
		if (!Array.isArray(items))
		{
			return;
		}

		/**
		 * This will get the deleted rows.
		 */
		items.forEach((item) =>
		{
			// @ts-ignore
			this.delete(item[this.key]);
		});

		// Update hasItems after removal
		// @ts-ignore
		this.updateHasItems();
	},

	/**
	 * This will set the items in the list.
	 *
	 * @public
	 * @param {array} rows
	 * @returns {void}
	 */
	setRows(rows)
	{
		const safeRows = Array.isArray(rows) ? rows : [];
		// @ts-ignore
		this.data.set('items', safeRows);
		// @ts-ignore
		this.updateHasItems();
	},

	/**
	 * This will get the items in the list.
	 *
	 * @public
	 * @returns {array}
	 */
	getRows()
	{
		// @ts-ignore
		return this.data.get('items') || [];
	},

	/**
	 * This will reset the list.
	 *
	 * @public
	 * @returns {void}
	 */
	reset()
	{
		// @ts-ignore
		this.data.set('items', []);
		// @ts-ignore
		this.data.set('hasItems', false);

		// @ts-ignore
		if (this.rowDivider)
		{
			// @ts-ignore
			this.rowDivider.reset();
		}
	},

	/**
	 * This will append items to the list.
	 *
	 * @public
	 * @param {array|object} items
	 * @returns {void}
	 */
	append(items)
	{
		if (!items)
		{
			return;
		}

		if (!Array.isArray(items))
		{
			items = [items];
		}

		items = clone(items);

		/**
		 * This will get all the new rows to be batched later.
		 */
		const rows = [];
		// @ts-ignore
		let lastIndex = this.data.items.length - 1;
		items.forEach((item) =>
		{
			// @ts-ignore
			if (this.rowDivider)
			{
				// @ts-ignore
				this.rowDivider.append(item, rows);
			}

			/**
			 * This will build the new rows that will be appended.
			 */
			// @ts-ignore
			const rowElement = this.row(item, lastIndex + 1);
			if (rowElement)
			{
				rows.push(rowElement);
			}

			/**
			 * This will silently add the new rows without re-rendering the entire list.
			 */
			// @ts-ignore
			this.data.set(`items[${++lastIndex}]`, item);
		});

		// Update hasItems after appending
		// @ts-ignore
		this.updateHasItems();

		// This will batch push all the rows.
		if (rows.length > 0)
		{
			// @ts-ignore
			ChildHelper.append(rows, this.panel, this);
		}
	},

	/**
	 * This will mingle the new items with the old items.
	 *
	 * @public
	 * @param {Array<Object>} newItems
	 * @param {boolean} withDelete
	 * @returns {void}
	 */
	mingle(newItems, withDelete = false)
	{
		if (!Array.isArray(newItems))
		{
			return;
		}

		newItems = clone(newItems);

		// @ts-ignore
		const oldItems = this.data.get('items') || [];

		/**
		 * This will diff the old and new items to determine what has
		 * been added, updated, or deleted.
		 */
		// @ts-ignore
		const changes = DataHelper.diff(oldItems, newItems, this.key);

		/**
		 * We want to delete the items before adding and updating the
		 * new items.
		 */
		if (withDelete && changes.deletedItems.length > 0)
		{
			// @ts-ignore
			this.remove(changes.deletedItems);
		}

		/**
		 * This will add or update the new rows.
		 */
		changes.changes.forEach((row) =>
		{
			// @ts-ignore
			this.replace(row);
		});

		// Update hasItems after mingling
		// @ts-ignore
		this.updateHasItems();
	},

	/**
	 * This will prepend items to the list.
	 *
	 * @public
	 * @param {array|object} items
	 * @returns {void}
	 */
	prepend(items)
	{
		if (!items)
		{
			return;
		}

		if (!Array.isArray(items))
		{
			items = [items];
		}

		items = clone(items);

		/**
		 * This will get all the new rows to be batched later.
		 */
		const rows = [];
		const reverseItems = items.reverse();
		reverseItems.forEach((item) =>
		{
			// @ts-ignore
			if (this.rowDivider)
			{
				// @ts-ignore
				this.rowDivider.prepend(item, rows);
			}

			/**
			 * This will build the new rows that will be prepended.
			 */
			// @ts-ignore
			const rowElement = this.row(item, 0);
			if (rowElement)
			{
				rows.push(rowElement);
			}
		});

		// This will use the get method to get the items as a raw array.
		// @ts-ignore
		const existingItems = this.data.get('items') || [];
		const newItems = reverseItems.concat(existingItems);

		/**
		 * This will silently add the new rows without re-rendering the entire
		 * list. This will bypass the data object and directly add the items
		 * to the stage.
		 */
		// @ts-ignore
		this.data.attributes.items = newItems;
		// @ts-ignore
		this.data.stage.items = newItems;

		// Update hasItems after prepending
		// @ts-ignore
		this.updateHasItems();

		if (rows.length > 0)
		{
			// @ts-ignore
			ChildHelper.prepend(rows, this.panel, this);
		}
	},

	/**
	 * Updates the hasItems flag based on current items length.
	 *
	 * @private
	 * @returns {void}
	 */
	updateHasItems()
	{
		// @ts-ignore
		const items = this.data.get('items') || [];
		const hasItems = Array.isArray(items) && items.length > 0;
		// @ts-ignore
		this.data.set('hasItems', hasItems);
	},

	/**
	 * Finds the index of an item in the data array by its key.
	 *
	 * @private
	 * @param {*} keyValue
	 * @returns {number} Index of the item, or -1 if not found
	 */
	findIndexByKey(keyValue)
	{
		//@ts-ignore
		const items = this.data.get('items') || [];
		//@ts-ignore
		return items.findIndex((item) => item && item[this.key] === keyValue);
	}
});