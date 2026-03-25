import { Div, On } from '@base-framework/atoms';
import { Component, Data, Jot } from '@base-framework/base';
import { ChildHelper } from '../utils/child-helper.js';
import { DataHelper } from '../utils/data-helper.js';
import { RowDivider } from './row-divider.js';

/**
 * Deep-clone the incoming data so mutations never leak back to the caller.
 *
 * structuredClone handles Date, Map, Set, ArrayBuffer, nested objects, etc.
 * correctly and is typically faster than a JSON round-trip.
 *
 * It throws on non-cloneable values (functions, DOM nodes, Symbols) — in that
 * case we fall back to a shallow copy which silently skips those edge-cases
 * exactly as the original implementation did.
 *
 * @param {*} data
 * @returns {*}
 */
const clone = (data) =>
{
	if (Array.isArray(data))
	{
		try
		{
			return structuredClone(data);
		}
		catch (_)
		{
			// Fallback: shallow-copy each object in the array
			return data.map(item =>
			{
				if (item && typeof item === 'object')
				{
					return { ...item };
				}
				return item;
			});
		}
	}
	return data;
};

/**
 * List
 *
 * This will create a list component.
 *
 * @param {object} props
 * @property {string} class - The class to add to the list
 * @property {string} key - The key to use to identify the items
 * @property {Array<object>} [items] - The items
 * @property {object} [emptyState] - The empty state component to show when no items
 * @property {object} [divider] - The divider configuration
 * @property {function} rowItem - Function to render each row item
 * @property {string} [cache] - The cache name to use
 * @property {boolean} [linkParent] - The parent data to link
 * @property {boolean} [isDynamic] - Whether the list is dynamic
 * @property {object} [skeleton] - Skeleton loader configuration `{ number, row }` shown before data loads.
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

		// Initialize element cache for O(1) lookups by key
		// @ts-ignore
		this.elementCache = new Map();
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
		// @ts-ignore
		const isSkeletonEnabled = this.skeleton && items.length === 0;
		if (isSkeletonEnabled)
		{
			return new Data({
				// @ts-ignore
				items: this.generateSkeletonRows(),
				hasItems: true,
				showSkeleton: true
			});
		}

		return new Data({
			items,
			hasItems: null
		});
	},

	/**
	 * Generates skeleton placeholder rows from the skeleton configuration.
	 *
	 * @protected
	 * @returns {Array<object>}
	 */
	generateSkeletonRows()
	{
		// @ts-ignore
		const skeletonConfig = this.skeleton;
		const count = (skeletonConfig && typeof skeletonConfig === 'object' && skeletonConfig.number)
			? skeletonConfig.number
			: 3;
		const rowFn = (skeletonConfig && typeof skeletonConfig === 'object' && typeof skeletonConfig.row === 'function')
			? skeletonConfig.row
			: null;

		if (!rowFn)
		{
			return [];
		}

		return Array.from({ length: count }, (_, index) => rowFn(index));
	},

	/**
	 * Removes skeleton rows and prepares the list to receive real data.
	 * Clears the skeleton DOM and silently resets the items array.
	 *
	 * @protected
	 * @returns {void}
	 */
	removeSkeleton()
	{
		// @ts-ignore
		if (!this.data || !this.data.get('showSkeleton'))
		{
			return;
		}

		// @ts-ignore
		this.data.set('showSkeleton', false);
		// Silently reset items so append/prepend start from a clean state
		// @ts-ignore
		this.data.attributes.items = [];
		// @ts-ignore
		this.data.stage.items = [];
		// @ts-ignore
		if (this.listContainer)
		{
			// @ts-ignore
			ChildHelper.removeAll(this.listContainer);
		}
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

		/**
		 * For standalone lists (not managed by a DataContainer),
		 * set hasItems on the data so the On watcher renders
		 * the empty state on the initial pass. DataContainer-managed
		 * lists use linkParent=false and keep hasItems as null
		 * to avoid flashing the empty state during async loading.
		 * Also skip when skeleton is active — setData() already set
		 * hasItems to true for skeleton rows, and overwriting it
		 * with false would break the skeleton display.
		 */
		// @ts-ignore
		if (hasItems === false && this.linkParent !== false && !this.data.get('showSkeleton'))
		{
			// @ts-ignore
			this.data.set('hasItems', false);
		}
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
		// If skeleton placeholder rows are active, return the item directly —
		// it is already a rendered component, not raw data.
		// @ts-ignore
		if (this.data && this.data.get('showSkeleton'))
		{
			return item;
		}

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
				const wrapper = Div({
					'data-row-key': keyValue
				}, [rowLayout]);
				// Store in cache will happen after DOM render
				return wrapper;
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
			// Use key-based lookup (like replace()) so dividers in the DOM
			// don't cause an off-by-N mismatch between the data index and
			// the actual child node position.
			// @ts-ignore
			const rowElement = this.findRowElementByKey(keyValue);
			if (rowElement)
			{
				ChildHelper.remove(rowElement);
			}
		}

		// Remove from element cache
		// @ts-ignore
		if (this.elementCache) {
			// @ts-ignore
			this.elementCache.delete(String(keyValue));
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
		const length = items.length;
		for (let i = 0; i < length; i++)
		{
			const item = items[i];
			// @ts-ignore
			this.delete(item[this.key]);
		}

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
		// @ts-ignore
		this.removeSkeleton();
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
		// Clear both stage and attributes so data.get('items') returns [].
		// append()/prepend() patch both; reset() must match to avoid stale reads.
		// @ts-ignore
		this.data.stage.items = [];
		// @ts-ignore
		this.data.attributes.items = [];
		// @ts-ignore
		ChildHelper.removeAll(this.listContainer);

		// Silently reset hasItems on both stage and attributes so the next
		// reactive data.set('hasItems', false) from updateHasItems() always
		// detects a change — even when the previous committed value was
		// already false. Using data.set() here would queue a batched update
		// that gets overwritten by updateHasItems() in the same synchronous
		// callback, causing the batch to see false→false (no change) and
		// skip notifying the On watcher.
		// @ts-ignore
		this.data.stage.hasItems = null;
		// @ts-ignore
		this.data.attributes.hasItems = null;
		// @ts-ignore
		this.defaultHasItemValue = null;
		// @ts-ignore
		this.hasTrailingDivider = false;

		// Clear element cache
		// @ts-ignore
		if (this.elementCache) {
			// @ts-ignore
			this.elementCache.clear();
		}

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

		// @ts-ignore
		this.removeSkeleton();

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
		const existingItems = this.data.get('items') || [];
		const startIndex = existingItems.length;
		const length = items.length;

		// Build rows using traditional for loop for better performance
		for (let i = 0; i < length; i++)
		{
			const item = items[i];
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
			const rowElement = this.row(item, startIndex + i);
			if (rowElement)
			{
				rows.push(rowElement);
			}
		}

		// Batch update all items at once for better performance
		// @ts-ignore
		const newItems = existingItems.concat(items);

		/**
		 * Silently patch the data store for both initial and incremental appends
		 * so the for: directive is never triggered. This prevents the for: rebuild
		 * (which runs without dividers because isDynamic skips them in row()) from
		 * asynchronously wiping divider elements that ChildHelper.append already
		 * placed in the DOM. The for: directive is not needed here because all DOM
		 * management is done manually via ChildHelper for dynamic lists.
		 */
		// @ts-ignore
		this.data.attributes.items = newItems;
		// @ts-ignore
		this.data.stage.items = newItems;

		// Only update hasItems reactively when the state actually needs
		// to change, to avoid triggering unnecessary batched publishes.
		// @ts-ignore
		if (this.data.get('hasItems') !== true)
		{
			// @ts-ignore
			this.updateHasItems();
		}

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
		const changesLength = changes.changes.length;
		for (let i = 0; i < changesLength; i++)
		{
			const row = changes.changes[i];
			// @ts-ignore
			this.replace(row);
		}

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
		const changesLength = changes.changes.length;
		for (let i = 0; i < changesLength; i++)
		{
			const row = changes.changes[i];
			if (deleteIfFound)
			{
				// @ts-ignore
				this.remove([row.item]);
				row.status = 'added';
			}

			// @ts-ignore
			this.replace(row, append);
		}

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
		const changesLength = changes.length;
		for (let i = 0; i < changesLength; i++)
		{
			const row = changes[i];
			// @ts-ignore
			this.replace(row);
		}

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

		// @ts-ignore
		this.removeSkeleton();

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

		// Remove the first child of listContainer if it is a divider.
		// When prepending a new batch, the incoming rows will re-insert
		// the correct seam divider at the proper position. Without this,
		// the old seam divider ends up stranded in the middle of the
		// date group after new items are prepended above it.
		// @ts-ignore
		if (this.listContainer)
		{
			// @ts-ignore
			const firstChild = this.listContainer.firstChild;
			if (firstChild && firstChild.getAttribute && firstChild.getAttribute('data-divider') === 'true')
			{
				// @ts-ignore
				this.listContainer.removeChild(firstChild);
			}
		}

		/**
		 * This will get all the new rows to be batched later.
		 */
		const rows = [];
		const reverseItems = items.reverse();
		const reverseLength = reverseItems.length;

		// Build rows using traditional for loop for better performance
		for (let i = 0; i < reverseLength; i++)
		{
			const item = reverseItems[i];
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
		}

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

		// Only update hasItems reactively when the state actually needs
		// to change. When hasItems is already true, skipping the call
		// avoids triggering a batched reactive publish that can cause
		// the for: directive to re-process items asynchronously, which
		// disrupts scroll position preservation in scroll-up lists.
		// @ts-ignore
		if (this.data.get('hasItems') !== true)
		{
			// @ts-ignore
			this.updateHasItems();
		}

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

		// Route through addDivider() so the lastDividerValue dedup guard suppresses
		// a duplicate when the prepend loop already inserted a divider for this date.
		const trailingRows = [];
		// @ts-ignore
		this.rowDivider.addDivider(value, trailingRows);
		// @ts-ignore
		if (trailingRows.length > 0 && this.listContainer)
		{
			// Prepend the divider to the top of the list (before the oldest item)
			// @ts-ignore
			ChildHelper.prepend(trailingRows, this.listContainer, this);

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
	 * Now uses element cache for O(1) lookups.
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

		const keyString = String(keyValue);

		// Try cache first for O(1) lookup
		// @ts-ignore
		if (this.elementCache && this.elementCache.has(keyString))
		{
			// @ts-ignore
			const cached = this.elementCache.get(keyString);
			// Verify element is still in DOM
			// @ts-ignore
			if (cached && this.listContainer.contains(cached))
			{
				return cached;
			}
			// Remove stale cache entry
			// @ts-ignore
			this.elementCache.delete(keyString);
		}

		// Fallback to DOM search and update cache
		// @ts-ignore
		const children = this.listContainer.children;
		const childrenLength = children.length;

		for (let i = 0; i < childrenLength; i++)
		{
			const child = children[i];
			// Skip dividers
			if (child.hasAttribute && child.hasAttribute('data-divider'))
			{
				continue;
			}

			// Check if this row has the matching key
			if (child.hasAttribute && child.getAttribute('data-row-key') === keyString)
			{
				// Update cache
				// @ts-ignore
				if (this.elementCache)
				{
					// @ts-ignore
					this.elementCache.set(keyString, child);
				}
				return child;
			}
		}

		return null;
	}
});