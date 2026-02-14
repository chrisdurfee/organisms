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
 * @returns {Component}
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
		this.setupHasItems();
	},

	/**
	 * This will set up the hasItems value.
	 *
	 * @protected
	 * @returns {void}
	 */
	setupHasItems()
	{
		// @ts-ignore
		// If we have already set the default, skip it
		if (this.defaultHasItemValue)
		{
			// @ts-ignore
			this.data.set('hasItems', true);
			return;
		}

		// @ts-ignore
		let parentValue = this.linkParentData();

		let hasItems = parentValue || null;
		if (parentValue !== undefined)
		{
			/**
			 * If parent already has items (hasItems === true), respect that value.
			 * This prevents empty state flash when navigating back to a list
			 * that was previously populated via data linking.
			 */
			if (parentValue === true)
			{
				hasItems = true;
			}
			else
			{
				// @ts-ignore
				const items = this.items || [];
				// @ts-ignore
				hasItems = (Array.isArray(items) && items.length > 0);
			}
		}

		// @ts-ignore
		this.defaultHasItemValue = hasItems;
	},

	/**
	 * This will link the parent data to the list.
	 *
	 * @protected
	 * @returns {*}
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
			return undefined;
		}
		return parentValue;
	},

	/**
	 * This will check if we have added items that should persist.
	 *
	 * @protected
	 * @returns {void}
	 */
	checkHasAddedItems()
	{
		// @ts-ignore
		if (this.defaultHasItemValue === true)
		{
			return;
		}

		// @ts-ignore
		const items = this.data.get('items') || [];

		// Determine if we have added items that should persist
		// @ts-ignore
		const hasAddedItems = (items.length > 0 && this.persist === true);
		if (hasAddedItems)
		{
			// @ts-ignore
			this.defaultHasItemValue = true;
		}
	},

	/**
	 * Called when the component is destroyed.
	 *
	 * @public
	 * @returns {void}
	 */
	destroy()
	{
		// @ts-ignore
		this.checkHasAddedItems();

		// If we added items to a linked parent, reset hasItems to default
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

		// Only add dividers via the for: directive if we're not in dynamic mode.
		// Dynamic lists (prepend/append) manage dividers separately to prevent duplicates.
		// @ts-ignore
		if (this.rowDivider && children && this.isDynamic !== true)
		{
			// @ts-ignore
			this.rowDivider.append(item, children);
		}

		// @ts-ignore
		const rowLayout = this.rowItem(item, index);

		// Add a data attribute with the item's key for reliable DOM element lookup
		// This is needed because dividers and prepending can shift DOM positions
		// @ts-ignore
		if (rowLayout && this.key && item[this.key] !== undefined)
		{
			// @ts-ignore
			const keyValue = String(item[this.key]);

			// If rowLayout is a Component instance or doesn't have a tag property,
			// wrap it in a div with the data-row-key attribute
			if (rowLayout instanceof Component || !rowLayout.tag)
			{
				return Div({
					'data-row-key': keyValue
				}, [rowLayout]);
			}

			// Otherwise add the attribute directly to the layout object
			// @ts-ignore
			rowLayout['data-row-key'] = keyValue;
		}

		return rowLayout;
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
		if (this.listContainer)
		{
			// @ts-ignore
			const rowElement = ChildHelper.get(this.listContainer, index);
			if (rowElement)
			{
				ChildHelper.remove(rowElement);
			}
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
	 * @param {boolean} append
	 * @returns {void}
	 */
	replace(row, append = true)
	{
		if (row.status === 'unchanged')
		{
			return;
		}

		// @ts-ignore
		const item = row.item;
		if (row.status === 'added')
		{
			if (append)
			{
				// @ts-ignore
				this.append(item);
				return;
			}

			// @ts-ignore
			this.prepend(item);
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

		// Find the actual DOM element by its key attribute
		// @ts-ignore
		const oldRow = this.findRowElementByKey(keyValue);
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
		this.hasTrailingDivider = false;

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
		// @ts-ignore
		if (rows.length > 0 && this.listContainer)
		{
			// @ts-ignore
			ChildHelper.append(rows, this.listContainer, this);
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
	 * This will mingle the new items with the old items.
	 *
	 * @public
	 * @param {Array<Object>} newItems
	 * @param {boolean} append
	 * @param {boolean} deleteIfFound
	 * @returns {void}
	 */
	merge(newItems, append = true, deleteIfFound = false)
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
		 * This will add or update the new rows.
		 */
		changes.changes.forEach((row) =>
		{
			if (deleteIfFound)
			{
				// @ts-ignore
				this.remove([row.item]);
				row.status = 'added';
			}

			// @ts-ignore
			this.replace(row, append);
		});

		// Update hasItems after mingling
		// @ts-ignore
		this.updateHasItems();
	},

	/**
	 * This will modify existing items in the list with updated data.
	 *
	 * @public
	 * @param {Array<Object>} updatedItems
	 * @param {boolean} addMissing
	 * @returns {void}
	 */
	modify(updatedItems, addMissing = false)
	{
		if (!Array.isArray(updatedItems))
		{
			return;
		}

		// @ts-ignore
		const updatingItems = clone(updatedItems);

		// @ts-ignore
		const oldItems = this.data.get('items') || [];
		// @ts-ignore
		const changes = DataHelper.modify(updatingItems, oldItems, this.key, addMissing);

		/**
		 * This will add or update the new rows.
		 */
		changes.forEach((row) =>
		{
			// @ts-ignore
			this.replace(row);
		});

		// Update hasItems after modifying
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

		// @ts-ignore
		if (rows.length > 0 && this.listContainer)
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

		// Prevent adding multiple trailing dividers
		// @ts-ignore
		if (this.hasTrailingDivider)
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
		// @ts-ignore
		if (dividerLayout && this.listContainer)
		{
			// Mark dividers so they can be identified
			if (typeof dividerLayout === 'object')
			{
				dividerLayout['data-divider'] = 'true';
			}

			// Prepend the divider to the top of the list (before the oldest item)
			// @ts-ignore
			ChildHelper.prepend([dividerLayout], this.listContainer, this);

			// @ts-ignore
			this.hasTrailingDivider = true;
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
	},

	/**
	 * Finds a row DOM element by its key value.
	 * This is more reliable than finding by index, especially after prepending
	 * or when dividers are present.
	 *
	 * @private
	 * @param {*} keyValue - The key value to find
	 * @returns {HTMLElement|null} The DOM element, or null if not found
	 */
	findRowElementByKey(keyValue)
	{
		// @ts-ignore
		if (!this.listContainer)
		{
			return null;
		}

		// @ts-ignore
		const children = Array.from(this.listContainer.children);
		const keyString = String(keyValue);

		for (const child of children)
		{
			// Skip dividers
			if (child.hasAttribute && child.hasAttribute('data-divider'))
			{
				continue;
			}

			// Check if this row has the matching key
			if (child.hasAttribute && child.getAttribute('data-row-key') === keyString)
			{
				return child;
			}
		}

		return null;
	}
});