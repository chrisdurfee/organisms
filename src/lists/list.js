import { Div, On } from '@base-framework/atoms';
import { Component, Data, Jot } from '@base-framework/base';
import { ChildHelper } from '../utils/child-helper.js';
import { DataHelper } from '../utils/data-helper.js';
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
 * @property {string} [cache] - The cache name to use
 * @property {boolean} [linkParent] - The parent data to link
 * @property {boolean} [isDynamic] - Whether the list is dynamic
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

		return new Data({
			items,
			hasItems: null
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
		let parentValue = false;
		// @ts-ignore
		const parentData = this.parent?.data ?? this.parent?.context?.data ?? null;
		// @ts-ignore
		if (parentData && this.linkParent !== false)
		{
			parentValue = parentData.get('hasItems');
			// @ts-ignore
			this.data.link(parentData, 'hasItems');
		}
		// @ts-ignore
		else if (this.isDynamic === true)
		{
			parentValue = undefined;
		}

		let hasItems = parentValue || null;
		if (parentValue !== undefined)
		{
			// @ts-ignore
			const items = this.items || [];
			// @ts-ignore
			hasItems = (Array.isArray(items) && items.length > 0);
			// @ts-ignore
			this.data.set('hasItems', hasItems);
		}

		// @ts-ignore
		this.defaultHasItemValue = hasItems;
	},

	/**
	 * Called when the component is destroyed.
	 *
	 * @public
	 * @return {void}
	 */
	destroy()
	{
		// @ts-ignore
		this.data.hasItems = this.defaultHasItemValue;
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

		return Div({ class: 'flex flex-auto flex-col' }, [
			On('hasItems', (hasItems) =>
			{
				// @ts-ignore
				return (hasItems === false && this.emptyState)? this.emptyState() : null;
			}),
			Div({
				cache: 'listContainer',
				// @ts-ignore
				class: `list ${this.class || ''}`,
				onSet: ['hasItems', { hidden: false }],
				for: ['items', rowCallBack]
			})
		]);
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
		const rowElement = ChildHelper.get(this.listContainer, index);
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
		const oldRow = ChildHelper.get(this.listContainer, index);
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
	 * This will check if the list is empty.
	 *
	 * @public
	 * @returns {boolean}
	 */
	isEmpty()
	{
		// @ts-ignore
		return this.data.get('items')?.length === 0;
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
			ChildHelper.append(rows, this.listContainer, this);
		}
	},

	/**
	 * This will mingle the new items with the old items.
	 *
	 * Extended: accepts an optional options object to control how updated
	 * items are treated (moved to top/bottom or kept in place). Backwards
	 * compatible: existing callers passing only (newItems, withDelete)
	 * will continue to work.
	 *
	 * Options:
	 *  - scrollDirection: 'prepend' | 'append' | null (used as a hint where
	 *      newly fetched items are expected to be inserted)
	 *  - moveUpdated: 'keep' | 'toScrollDirection' | function(row, oldIndex) => 'prepend'|'append'|'keep'
	 *  - itemMoveKey: string name of a per-item flag (defaults to '__move')
	 *      supported values on the item: 'prepend'|'append'|'keep'
	 *
	 * @public
	 * @param {Array<Object>} newItems
	 * @param {boolean} withDelete
	 * @param {object} [options]
	 * @returns {void}
	 *
	 * Examples:
	 * // 1) Default (backwards compatible): diff and update in-place
	 * this.mingle(newItems, true);
	 *
	 * // 2) If you fetched newer messages and want new items added to top:
	 * this.mingle(newItems, true, { scrollDirection: 'prepend', moveUpdated: 'toScrollDirection' });
	 *
	 * // 3) Per-item control (server sets __move to 'prepend'|'append'|'keep'):
	 * // each item can include: item.__move = 'prepend'; then call mingle normally
	 * this.mingle(newItems, true);
	 *
	 * // 4) Custom logic: provide a function to decide per-row
	 * this.mingle(newItems, true, { moveUpdated: (row, oldIndex) => {
	 *     // return 'prepend'|'append'|'keep'
	 *     return (row.item.shouldPromote) ? 'prepend' : 'keep';
	 * }});
	 *
	 */
	mingle(newItems, withDelete = false, options = {})
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

		// Normalize options
		const scrollDirection = options.scrollDirection || null; // 'prepend' | 'append' | null
		const moveUpdated = options.moveUpdated || 'keep';
		const itemMoveKey = options.itemMoveKey || '__move';

		/**
		 * We want to delete the items before adding and updating the
		 * new items if requested.
		 */
		if (withDelete && changes.deletedItems.length > 0)
		{
			// @ts-ignore
			this.remove(changes.deletedItems);
		}

		/**
		 * Helper to decide move action for an updated row.
		 * Returns 'prepend'|'append'|'keep'.
		 */
		const decideMoveAction = (row, oldIndex) =>
		{
			// Per-item explicit move flag has highest priority
			if (row.item && typeof row.item === 'object' && row.item[itemMoveKey])
			{
				const v = row.item[itemMoveKey];
				if (v === 'prepend' || v === 'append' || v === 'keep')
				{
					return v;
				}
			}

			// If moveUpdated is a function, call it
			if (typeof moveUpdated === 'function')
			{
				try {
					const r = moveUpdated(row, oldIndex);
					if (r === 'prepend' || r === 'append' || r === 'keep')
					{
						return r;
					}
				} catch (e) {
					// swallow and fallthrough to defaults
				}
			}

			// If configured to move updated to the scroll direction, do that
			if (moveUpdated === 'toScrollDirection' && scrollDirection)
			{
				return scrollDirection; // 'prepend' or 'append'
			}

			// Default: keep in place
			return 'keep';
		};

		/**
		 * This will add/update/move the new rows according to decision rules.
		 */
		changes.changes.forEach((row) =>
		{
			// If row is newly added, place according to scrollDirection hint
			if (row.status === 'added')
			{
				if (scrollDirection === 'prepend')
				{
					// @ts-ignore
					this.prepend(row.item);
				}
				else
				{
					// default existing behavior is append
					// @ts-ignore
					this.append(row.item);
				}
				return;
			}

			// For updated rows, we may keep, replace in place, or move to top/bottom
			if (row.status === 'updated')
			{
				// find current index
				// @ts-ignore
				const keyValue = row.item[this.key];
				// @ts-ignore
				const oldIndex = this.findIndexByKey(keyValue);
				const action = decideMoveAction(row, oldIndex);

				if (action === 'keep')
				{
					// update in place
					// @ts-ignore
					this.replace(row);
					return;
				}

				// If action is prepend/append: remove existing (if present) and insert at requested location
				if (action === 'prepend' || action === 'append')
				{
					// remove existing if present
					if (oldIndex !== -1)
					{
						// use delete to remove DOM and data
						// @ts-ignore
						this.delete(keyValue);
					}

					if (action === 'prepend')
					{
						// @ts-ignore
						this.prepend(row.item);
					}
					else
					{
						// @ts-ignore
						this.append(row.item);
					}
					return;
				}
			}

			// Fallback: call replace for other statuses (unchanged handled inside replace)
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

		// Set the prepend boundary to the first existing item's date
		// @ts-ignore
		if (this.rowDivider)
		{
			// @ts-ignore
			const existingItems = this.data.get('items') || [];
			if (existingItems.length > 0)
			{
				// @ts-ignore
				this.rowDivider.setPrependBoundary(existingItems[0]);
			}
		}

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
			ChildHelper.prepend(rows, this.listContainer, this);
		}
	},

	/**
	 * This will add a trailing divider after the last item in the list.
	 * Useful for showing the date of the oldest items when reaching the end.
	 *
	 * @public
	 * @returns {void}
	 */
	addTrailingDivider()
	{
		// @ts-ignore
		if (!this.rowDivider)
		{
			return;
		}

		// @ts-ignore
		const items = this.data.get('items') || [];
		if (items.length === 0)
		{
			return;
		}

		// Get the first (oldest) item - items are in DESC order (newest first)
		// so the oldest item is at index 0
		const oldestItem = items[0];
		// @ts-ignore
		const value = this.rowDivider.getValue(oldestItem);

		// Create the divider layout
		// @ts-ignore
		const dividerLayout = this.rowDivider.layout(value);
		if (dividerLayout)
		{
			// Prepend the divider to the top of the list (before the oldest item)
			// @ts-ignore
			ChildHelper.prepend([dividerLayout], this.listContainer, this);
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