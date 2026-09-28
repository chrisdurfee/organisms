/**
 * A frozen copy of List as it was before the Phase 4 batching work.
 * The equivalence tests run the same operations on this and on the
 * current List and compare the resulting rows and DOM.
 */
import { Div, On } from '@base-framework/atoms';
import { Component, Data, Jot } from '@base-framework/base';
import { ChildHelper } from '../../src/utils/child-helper.js';
import { DataHelper } from '../../src/utils/data-helper.js';
import { RowDivider } from '../../src/lists/row-divider.js';

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
 * The list that owns each linked parent key, per parent data object.
 *
 * Linking is two-way, so two sibling lists linked to the same parent key
 * would overwrite each other's hasItems (one list emptying would show the
 * other's empty state). The first live list to link a key owns it; a
 * sibling that finds the key taken keeps its own local hasItems instead.
 *
 * @type {WeakMap<object, Map<string, object>>}
 */
const parentLinkOwners = new WeakMap();

/**
 * Claims a parent data key for a list. Succeeds when the key is free,
 * already owned by this list, or owned by a list that is no longer
 * rendered (destroyed, or a persisted instance being resumed).
 *
 * @param {object} parentData
 * @param {string} attr
 * @param {object} list
 * @returns {boolean}
 */
const claimParentLink = (parentData, attr, list) =>
{
	let owners = parentLinkOwners.get(parentData);
	if (!owners)
	{
		owners = new Map();
		parentLinkOwners.set(parentData, owners);
	}

	const owner = owners.get(attr);
	if (owner && owner !== list && owner.rendered === true)
	{
		return false;
	}

	owners.set(attr, list);
	return true;
};

/**
 * Releases a parent data key claimed by a list.
 *
 * @param {object|null} parentData
 * @param {string} attr
 * @param {object} list
 * @returns {void}
 */
const releaseParentLink = (parentData, attr, list) =>
{
	const owners = (parentData)? parentLinkOwners.get(parentData) : null;
	if (owners && owners.get(attr) === list)
	{
		owners.delete(attr);
	}
};

/**
 * The most skeleton rows a list derives from its page size.
 *
 * @type {number}
 */
const MAX_SKELETON_ROWS = 10;

/**
 * Resolves how many skeleton rows to render.
 *
 * An explicit `skeleton.number` always wins. Otherwise a list that knows
 * its page `limit` renders one placeholder per expected row (capped at
 * MAX_SKELETON_ROWS) so the first page replaces the skeleton without the
 * content height jumping; lists without a limit keep the fallback count.
 *
 * @param {*} skeletonConfig
 * @param {*} limit
 * @param {number} fallback
 * @returns {number}
 */
export const getSkeletonCount = (skeletonConfig, limit, fallback) =>
{
	if (skeletonConfig && typeof skeletonConfig === 'object' && skeletonConfig.number)
	{
		return skeletonConfig.number;
	}

	const pageSize = Math.floor(Number(limit));
	if (Number.isFinite(pageSize) && pageSize > 0)
	{
		return Math.min(pageSize, MAX_SKELETON_ROWS);
	}

	return fallback;
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
 * @property {boolean|string} [linkParent] - Links the list's hasItems to the parent data.
 *   `true`/unset links the parent's `hasItems` key; a string links the parent key of
 *   that name instead (use one per list to observe several sibling lists); `false`
 *   disables the link. Only one live list can own a parent key: a sibling list that
 *   finds the key already linked keeps its own hasItems.
 * @property {boolean} [isDynamic] - Whether the list is dynamic
 * @property {object} [skeleton] - Skeleton loader configuration `{ number, row }` shown before data loads.
 *   Without `number` the row count defaults to min(limit, 10) when `limit` is set, otherwise 3.
 * @property {number} [limit] - The page size of the container feeding the list. Only used to
 *   size the default skeleton.
 * @property {string} [minHeight] - A CSS min-height reserved on the list while it is loading
 *   (hasItems is null) so content does not pop in. Removed once rows or the empty state
 *   render. Off by default.
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

		/**
		 * Both indexes are rebuilt in a single pass when a lookup misses
		 * while they are stale, so a batch of m lookups over n rows costs
		 * O(n + m) instead of the O(n * m) it costs to scan per lookup.
		 */
		// @ts-ignore
		this.elementCacheStale = true;

		// @ts-ignore
		this.itemIndexCache = new Map();
		// @ts-ignore
		this.itemIndexCacheStale = true;
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

		/**
		 * Skeleton requires a row layout function; without one the list
		 * would render blank while hasItems is locked to true (no rows,
		 * no empty state), so treat it as disabled and warn the developer.
		 */
		// @ts-ignore
		const hasSkeletonRow = (this.skeleton && typeof this.skeleton.row === 'function');
		// @ts-ignore
		if (this.skeleton && !hasSkeletonRow && items.length === 0)
		{
			// @ts-ignore
			console.warn('[organisms] List skeleton config requires a `row` function. Skeleton disabled.', this.skeleton);
		}

		const isSkeletonEnabled = (hasSkeletonRow && items.length === 0);
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
	 * @returns {Array<object>}
	 */
	generateSkeletonRows()
	{
		// @ts-ignore
		const skeletonConfig = this.skeleton;
		// @ts-ignore
		const count = getSkeletonCount(skeletonConfig, this.limit, 3);
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

		/**
		 * Silently reset items so append/prepend start from a clean
		 * state. Both stores share one array because the in-place array
		 * mutations elsewhere (data.delete splices the staged array) rely
		 * on the two staying aliased.
		 */
		const items = [];
		// @ts-ignore
		this.data.attributes.items = items;
		// @ts-ignore
		this.data.stage.items = items;
		// @ts-ignore
		this.clearIndexes();

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
	 * The link is released by the framework: prepareDestroy() calls
	 * data.unlink() whenever the unit is not persisting, which tears
	 * down both directions of the pair.
	 *
	 * @returns {*}
	 */
	linkParentData()
	{
		// @ts-ignore
		const parentData = this.parent?.data ?? this.parent?.context?.data ?? null;
		// @ts-ignore
		const attr = this.getParentLinkKey();
		// @ts-ignore
		if (parentData && this.linkParent !== false && claimParentLink(parentData, attr, this))
		{
			// @ts-ignore
			this.linkedParentData = parentData;
			const parentValue = parentData.get(attr);
			if (attr === 'hasItems')
			{
				// @ts-ignore
				this.data.link(parentData, 'hasItems');
			}
			else
			{
				// @ts-ignore
				this.data.link(parentData, attr, 'hasItems');

				/**
				 * An aliased link only syncs the initial value onto the
				 * parent's key name, so copy it onto hasItems here.
				 */
				if (parentValue !== undefined)
				{
					// @ts-ignore
					this.data.set('hasItems', parentValue);
				}
			}
			return parentValue;
		}

		// @ts-ignore
		if (this.isDynamic === true)
		{
			return undefined;
		}
		return false;
	},

	/**
	 * Returns the parent data key the list's hasItems is linked to.
	 *
	 * @returns {string}
	 */
	getParentLinkKey()
	{
		// @ts-ignore
		const linkParent = this.linkParent;
		return (typeof linkParent === 'string' && linkParent !== '')? linkParent : 'hasItems';
	},

	/**
	 * This will check if we have added items that should persist.
	 *
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
	 * @returns {void}
	 */
	destroy()
	{
		// @ts-ignore
		this.checkHasAddedItems();

		/**
		 * Silently patch hasItems on both stage and attributes so the
		 * persisted value survives into the next mount without queuing a
		 * reactive publish on a component that is being torn down.
		 */
		// @ts-ignore
		this.data.stage.hasItems = this.defaultHasItemValue;
		// @ts-ignore
		this.data.attributes.hasItems = this.defaultHasItemValue;

		/**
		 * Free the parent key so a list created later under the same
		 * parent can link to it.
		 */
		// @ts-ignore
		releaseParentLink(this.linkedParentData ?? null, this.getParentLinkKey(), this);
		// @ts-ignore
		this.linkedParentData = null;

		// When persist is enabled the item data is intentionally kept alive so
		// the list can show the previous results immediately on resume. However
		// the pagination cursor must be reset to null so the next fetch always
		// starts from the beginning instead of continuing from where it left off.
		// resetPagination() is injected by DataContainer / BiDirectionalContainer.
		// @ts-ignore
		if (this.persist === true && typeof this.resetPagination === 'function')
		{
			// @ts-ignore
			this.resetPagination();
		}

		/**
		 * Drop the node index so a destroyed list does not keep its
		 * detached row elements alive.
		 */
		// @ts-ignore
		this.clearIndexes();
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

		return Div({
			class: 'flex flex-auto flex-col',
			// @ts-ignore
			onSet: this.getMinHeightWatcher()
		}, [
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
				/**
				 * The explicit-data form with scope=false skips the
				 * per-row scoped Data allocation (a full Data instance
				 * plus two link subscriptions per item key) that row()
				 * never uses.
				 */
				// @ts-ignore
				for: [this.data, 'items', rowCallBack, false]
			})
		]);
	},

	/**
	 * Returns the onSet watcher that reserves `minHeight` while the list
	 * is loading, or null when no minHeight is configured.
	 *
	 * hasItems stays null until the first response decides between rows
	 * and the empty state, so the reserved height is applied exactly
	 * while neither is rendered and cleared as soon as one of them is.
	 *
	 * @returns {Array<any>|null}
	 */
	getMinHeightWatcher()
	{
		// @ts-ignore
		const minHeight = this.minHeight;
		if (!minHeight || typeof minHeight !== 'string')
		{
			return null;
		}

		return ['hasItems', (hasItems, ele) =>
		{
			const loading = (hasItems === null || hasItems === undefined);
			ele.style.minHeight = (loading)? minHeight : '';
		}];
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
			// it cannot carry the attribute itself, so let wrapRow() tag it
			if (rowLayout instanceof Component || !rowLayout.tag)
			{
				// Store in cache will happen after DOM render
				// @ts-ignore
				return this.wrapRow(rowLayout, keyValue);
			}

			// Otherwise add the attribute directly to the layout object
			// @ts-ignore
			rowLayout['data-row-key'] = keyValue;
		}

		return rowLayout;
	},

	/**
	 * Wraps a row layout that cannot carry the data-row-key attribute
	 * itself (a Component instance or a layout without a tag) in an
	 * element that does.
	 *
	 * @param {object} rowLayout
	 * @param {string} keyValue
	 * @returns {object}
	 */
	wrapRow(rowLayout, keyValue)
	{
		return Div({
			'data-row-key': keyValue
		}, [rowLayout]);
	},

	/**
	 * This will delete an item from the list.
	 *
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
		this.elementCache.delete(String(keyValue));

		// The splice above shifted every index after the removed row.
		// @ts-ignore
		this.itemIndexCacheStale = true;

		// Update hasItems after deletion
		// @ts-ignore
		this.updateHasItems();
	},

	/**
	 * This will replace an item in the list.
	 *
	 * @param {object} row
	 * @param {boolean} append
	 * @returns {void}
	 */
	replace(row, append = true)
	{
		// @ts-ignore
		if (row.status === 'unchanged')
		{
			return;
		}

		// @ts-ignore
		const item = row.item;
		// @ts-ignore
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
			const newRow = ChildHelper.replace(layout, oldRow, this);

			/**
			 * The replacement carries the same key, so point the index at
			 * it instead of leaving an entry that will force a full DOM
			 * scan on the next lookup.
			 */
			// @ts-ignore
			if (newRow)
			{
				// @ts-ignore
				this.elementCache.set(String(keyValue), newRow);
			}
			else
			{
				// @ts-ignore
				this.elementCache.delete(String(keyValue));
			}
		}
	},

	/**
	 * This will remove items from the list.
	 *
	 * The removals are applied in one pass: the item array is filtered
	 * once and each row element is resolved through the key index, so the
	 * cost is the list length plus the number of removed rows instead of
	 * their product.
	 *
	 * @param {array} items
	 * @returns {void}
	 */
	remove(items)
	{
		if (!Array.isArray(items) || items.length === 0)
		{
			return;
		}

		// @ts-ignore
		const key = this.key;
		const removedKeys = new Set();
		for (let i = 0, length = items.length; i < length; i++)
		{
			const item = items[i];
			if (item)
			{
				removedKeys.add(item[key]);
			}
		}

		// @ts-ignore
		const existingItems = this.data.get('items') || [];
		const remaining = [];
		for (let i = 0, length = existingItems.length; i < length; i++)
		{
			const item = existingItems[i];
			if (!item || !removedKeys.has(item[key]))
			{
				remaining.push(item);
				continue;
			}

			// @ts-ignore
			const rowElement = this.findRowElementByKey(item[key]);
			if (rowElement)
			{
				ChildHelper.remove(rowElement);
			}

			// @ts-ignore
			this.elementCache.delete(String(item[key]));
		}

		/**
		 * The DOM is already up to date, so patch the store silently. A
		 * reactive set would rebuild every remaining row through the for:
		 * directive.
		 */
		// @ts-ignore
		this.data.attributes.items = remaining;
		// @ts-ignore
		this.data.stage.items = remaining;
		// @ts-ignore
		this.itemIndexCacheStale = true;

		// Update hasItems after removal
		// @ts-ignore
		this.updateHasItems();
	},

	/**
	 * This will check if the list is empty.
	 *
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
	 * @param {array} rows
	 * @returns {void}
	 */
	setRows(rows)
	{
		// @ts-ignore
		this.removeSkeleton();
		const safeRows = Array.isArray(rows) ? rows : [];

		/**
		 * A keyed reconcile only touches the rows that actually changed.
		 * The reactive fallback republishes the whole array, which makes
		 * the for: directive tear down and rebuild every row.
		 */
		// @ts-ignore
		if (this.reconcileRows(safeRows) === false)
		{
			// @ts-ignore
			this.clearIndexes();
			// @ts-ignore
			this.data.set('items', safeRows);
		}

		// @ts-ignore
		this.updateHasItems();
	},

	/**
	 * Applies a new item array to the DOM by key, reusing the row
	 * elements that are already rendered.
	 *
	 * Unchanged rows are left completely untouched, changed rows are
	 * rebuilt in place, removed rows are detached and new rows are built
	 * at their target position, so the work is proportional to what
	 * changed rather than to the list length. Reusing the nodes also
	 * preserves per-row state such as focus and scroll offset.
	 *
	 * A stable identity per row is required, so lists without a `key`,
	 * lists that group rows with dividers and lists that have not
	 * rendered yet fall back to the reactive rebuild.
	 *
	 * @param {Array<object>} newItems
	 * @returns {boolean} False when the list cannot be reconciled.
	 */
	reconcileRows(newItems)
	{
		// @ts-ignore
		const key = this.key;
		// @ts-ignore
		const container = this.listContainer;
		// @ts-ignore
		if (!key || !container || this.rowDivider || typeof this.rowItem !== 'function')
		{
			return false;
		}

		/**
		 * Reconciling by key is only sound when every row carries a
		 * unique, defined key.
		 */
		const targetKeys = new Set();
		for (let i = 0, length = newItems.length; i < length; i++)
		{
			const item = newItems[i];
			const keyValue = (item)? item[key] : undefined;
			if (keyValue === undefined || keyValue === null)
			{
				return false;
			}

			const keyString = String(keyValue);
			if (targetKeys.has(keyString))
			{
				return false;
			}
			targetKeys.add(keyString);
		}

		// @ts-ignore
		const oldItems = this.data.get('items') || [];

		/**
		 * diff() returns one entry per new item, in order, so the status
		 * of row i is changes[i].
		 */
		const changes = DataHelper.diff(oldItems, newItems, key).changes;

		// @ts-ignore
		const map = this.indexRowElements();

		/**
		 * Detach the rows that are gone first so the placement pass below
		 * only walks nodes that are being kept.
		 */
		map.forEach((element, keyString) =>
		{
			if (!targetKeys.has(keyString))
			{
				ChildHelper.remove(element);
				map.delete(keyString);
			}
		});

		/**
		 * `cursor` is the node currently sitting at the next target
		 * position. Every node before it has already been placed, so a
		 * kept row is either already the cursor (no DOM write at all) or
		 * gets moved in front of it.
		 */
		let cursor = container.firstChild;
		for (let i = 0, length = newItems.length; i < length; i++)
		{
			const item = newItems[i];
			const keyString = String(item[key]);
			let element = map.get(keyString);

			if (!element)
			{
				// @ts-ignore
				const layout = this.row(item, i);
				const inserted = ChildHelper.insertBefore(layout, container, cursor, this);
				if (inserted)
				{
					map.set(keyString, inserted);
				}
				continue;
			}

			const wasCursor = (element === cursor);
			const change = changes[i];
			if (!change || change.status !== 'unchanged')
			{
				// @ts-ignore
				const layout = this.row(item, i);
				const replacement = (layout)? ChildHelper.replace(layout, element, this) : null;
				if (replacement)
				{
					element = replacement;
					map.set(keyString, element);
				}
			}

			if (wasCursor || element === cursor)
			{
				cursor = element.nextSibling;
				continue;
			}

			container.insertBefore(element, cursor);
		}

		/**
		 * The DOM already matches, so patch the store silently: a
		 * reactive set would trigger the for: directive and rebuild every
		 * row that was just reused.
		 */
		// @ts-ignore
		this.data.attributes.items = newItems;
		// @ts-ignore
		this.data.stage.items = newItems;
		// @ts-ignore
		this.itemIndexCacheStale = true;

		return true;
	},

	/**
	 * This will get the items in the list.
	 *
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
	 * @returns {void}
	 */
	reset()
	{
		// Clear both stage and attributes so data.get('items') returns [].
		// append()/prepend() patch both; reset() must match to avoid stale
		// reads. One shared array keeps the two stores aliased, which the
		// in-place array mutations elsewhere rely on.
		const items = [];
		// @ts-ignore
		this.data.stage.items = items;
		// @ts-ignore
		this.data.attributes.items = items;
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

		/**
		 * The skeleton rows were just removed with the rest of the DOM,
		 * so drop the flag too. Left set, row() would keep returning raw
		 * items as layouts and a resumed list would never count as having
		 * rows. Patched silently like hasItems above.
		 */
		// @ts-ignore
		if (this.data.get('showSkeleton'))
		{
			// @ts-ignore
			this.data.stage.showSkeleton = false;
			// @ts-ignore
			this.data.attributes.showSkeleton = false;
		}

		// Clear the key indexes
		// @ts-ignore
		this.clearIndexes();

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
		// @ts-ignore
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

		/**
		 * Appending never shifts an existing index, so extend the key
		 * index in place rather than forcing a full rebuild on the next
		 * lookup. Interleaved appends and lookups (merge/mingle) would
		 * otherwise rebuild it once per added row.
		 */
		// @ts-ignore
		if (this.itemIndexCacheStale === false)
		{
			// @ts-ignore
			const map = this.itemIndexCache;
			for (let i = 0; i < length; i++)
			{
				const item = items[i];
				// @ts-ignore
				if (item && !map.has(item[this.key]))
				{
					// @ts-ignore
					map.set(item[this.key], startIndex + i);
				}
			}
		}

		// The new rows are not in the element index yet.
		// @ts-ignore
		this.elementCacheStale = true;

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

		// Clear skeleton placeholders first so the diff below compares
		// against real item data instead of rendered layout objects.
		// @ts-ignore
		this.removeSkeleton();

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
		 * This will add or update the new rows. Added rows are collected
		 * and inserted in one batch because each append() copies the whole
		 * item array, which makes per-row inserts cost O(items * added).
		 * Divider seams are position sensitive, so those lists keep the
		 * per-row path.
		 */
		const changesLength = changes.changes.length;
		const added = [];
		for (let i = 0; i < changesLength; i++)
		{
			const row = changes.changes[i];
			// @ts-ignore
			if (row.status === 'added' && !this.rowDivider)
			{
				added.push(row.item);
				continue;
			}

			// @ts-ignore
			this.replace(row);
		}

		if (added.length > 0)
		{
			// @ts-ignore
			this.append(added);
		}

		// Update hasItems after mingling
		// @ts-ignore
		this.updateHasItems();
	},

	/**
	 * This will mingle the new items with the old items.
	 *
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

		// Clear skeleton placeholders first so the diff below compares
		// against real item data instead of rendered layout objects.
		// @ts-ignore
		this.removeSkeleton();

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
		 * This will add or update the new rows. Added rows are batched;
		 * see mingle() for why. A batched prepend reverses the batch, so
		 * the resulting order matches the per-row path in both
		 * directions.
		 */
		const changesLength = changes.changes.length;
		const added = [];
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
			if (row.status === 'added' && !this.rowDivider)
			{
				added.push(row.item);
				continue;
			}

			// @ts-ignore
			this.replace(row, append);
		}

		if (added.length > 0)
		{
			// @ts-ignore
			(append)? this.append(added) : this.prepend(added);
		}

		// Update hasItems after mingling
		// @ts-ignore
		this.updateHasItems();
	},

	/**
	 * This will modify existing items in the list with updated data.
	 *
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

		// Clear skeleton placeholders first so the diff below compares
		// against real item data instead of rendered layout objects.
		// @ts-ignore
		this.removeSkeleton();

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
		// @ts-ignore
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
			 * This will build the new rows that will be prepended. The
			 * reversed batch is placed in front of the existing items in
			 * this order, so position i is the row's final data index.
			 */
			// @ts-ignore
			const rowElement = this.row(item, i);
			if (rowElement)
			{
				rows.push(rowElement);
			}
		}

		// This will use the get method to get the items as a raw array.
		// @ts-ignore
		const existingItems = this.data.get('items') || [];

		// When prepending into an empty list (initial load), the last item in
		// the reversed array ends up at the bottom of the DOM. Update lastAppend
		// so future append operations (e.g., new messages via SSE) compare against
		// the correct bottom-of-list value and don't insert duplicate dividers.
		// @ts-ignore
		if (this.rowDivider && existingItems.length === 0 && reverseItems.length > 0)
		{
			const bottomItem = reverseItems[reverseItems.length - 1];
			// @ts-ignore
			this.rowDivider.lastAppend = this.rowDivider.getValue(bottomItem);
		}

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

		/**
		 * Prepending shifts every existing index, and the new rows are
		 * not in the element index yet.
		 */
		// @ts-ignore
		this.itemIndexCacheStale = true;
		// @ts-ignore
		this.elementCacheStale = true;

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
		if (!this.listContainer)
		{
			return;
		}

		// If the first child is already a divider, the prepend loop already
		// inserted the correct header divider — skip to avoid duplicates.
		// @ts-ignore
		const firstChild = this.listContainer.firstChild;
		if (firstChild && firstChild.getAttribute && firstChild.getAttribute('data-divider') === 'true')
		{
			// @ts-ignore
			this.hasTrailingDivider = true;
			return;
		}

		// @ts-ignore
		const items = this.data.get('items') || [];
		if (items.length === 0)
		{
			return;
		}

		// Get the first (oldest) item - after prepend reversal the oldest
		// item sits at index 0.
		const oldestItem = items[0];
		// @ts-ignore
		const value = this.rowDivider.getValue(oldestItem);

		// Route through addDivider() so the lastDividerValue dedup guard suppresses
		// a duplicate when the prepend loop already inserted a divider for this date.
		const trailingRows = [];
		// @ts-ignore
		this.rowDivider.addDivider(value, trailingRows);
		// @ts-ignore
		if (trailingRows.length > 0)
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
	 * Empties both key indexes and marks them for a rebuild.
	 *
	 * @returns {void}
	 */
	clearIndexes()
	{
		// @ts-ignore
		if (this.elementCache)
		{
			// @ts-ignore
			this.elementCache.clear();
		}

		// @ts-ignore
		if (this.itemIndexCache)
		{
			// @ts-ignore
			this.itemIndexCache.clear();
		}

		// @ts-ignore
		this.elementCacheStale = true;
		// @ts-ignore
		this.itemIndexCacheStale = true;
	},

	/**
	 * Rebuilds the key to item-index map from the current items.
	 *
	 * The first index wins so the result matches the Array.findIndex
	 * lookup this replaced, including for duplicate keys.
	 *
	 * @returns {Map}
	 */
	indexItems()
	{
		// @ts-ignore
		const map = this.itemIndexCache;
		map.clear();

		// @ts-ignore
		const items = this.data.get('items') || [];
		// @ts-ignore
		const key = this.key;
		for (let i = 0, length = items.length; i < length; i++)
		{
			const item = items[i];
			if (item && !map.has(item[key]))
			{
				map.set(item[key], i);
			}
		}

		// @ts-ignore
		this.itemIndexCacheStale = false;
		return map;
	},

	/**
	 * Finds the index of an item in the data array by its key.
	 *
	 * @param {*} keyValue
	 * @returns {number} Index of the item, or -1 if not found
	 */
	findIndexByKey(keyValue)
	{
		// @ts-ignore
		const map = (this.itemIndexCacheStale !== false)? this.indexItems() : this.itemIndexCache;
		const index = map.get(keyValue);
		return (index === undefined)? -1 : index;
	},

	/**
	 * Indexes every keyed row element in the list container in one pass.
	 *
	 * @returns {Map}
	 */
	indexRowElements()
	{
		// @ts-ignore
		const map = this.elementCache;
		map.clear();

		// @ts-ignore
		const container = this.listContainer;
		if (!container)
		{
			return map;
		}

		const children = container.children;
		for (let i = 0, length = children.length; i < length; i++)
		{
			const child = children[i];
			// Skip dividers
			if (!child.hasAttribute || child.hasAttribute('data-divider'))
			{
				continue;
			}

			const keyString = child.getAttribute('data-row-key');
			if (keyString !== null && !map.has(keyString))
			{
				map.set(keyString, child);
			}
		}

		// @ts-ignore
		this.elementCacheStale = false;
		return map;
	},

	/**
	 * Finds a row DOM element by its key value.
	 * This is more reliable than finding by index, especially after prepending
	 * or when dividers are present.
	 *
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
		// @ts-ignore
		let map = this.elementCache;
		const cached = map.get(keyString);
		if (cached)
		{
			// @ts-ignore
			if (this.listContainer.contains(cached))
			{
				return cached;
			}

			/**
			 * An indexed element that left the DOM means the container
			 * was rebuilt behind the index, so re-index before failing.
			 */
			map.delete(keyString);
			// @ts-ignore
			map = this.indexRowElements();
			return map.get(keyString) ?? null;
		}

		// @ts-ignore
		if (this.elementCacheStale === false)
		{
			return null;
		}

		// @ts-ignore
		map = this.indexRowElements();
		return map.get(keyString) ?? null;
	}
});