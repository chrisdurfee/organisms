import { Tbody, Td, Tr } from '@base-framework/atoms';
import { Builder, Component, Data } from '@base-framework/base';
import { getSkeletonCount, List } from '../lists/list.js';
import { ChildHelper } from '../utils/child-helper.js';
import { SkeletonTableRow } from './skeleton-table-row.js';

/**
 * TableBody
 *
 * This will create a table body component with skeleton support.
 *
 * @param {object} props
 * @property {string} class - The class to add to the list
 * @property {string} key - The key to use to identify the items
 * @property {Array<object>} [items] - The items
 * @property {boolean|object} [skeleton] - Skeleton configuration. Can be true for default or object with { number: 5, row: customRowFunction }.
 *   Without `number` the row count defaults to min(limit, 10) when `limit` is set, otherwise 5.
 * @property {number} [columnCount] - Number of columns for skeleton rows and the empty state
 *   colspan (the empty state falls back to the table header cell count).
 * @property {function} [emptyState] - Returns the layout shown when there are no rows. It is
 *   rendered inside a single full-width row (`tr.empty-state-row > td[colspan]`).
 * @property {boolean} [clone=true] - Deep-copies every batch of rows (the default). Pass `false`
 *   to use the row objects as given and keep one copy of the data in memory; the caller must
 *   not mutate them afterwards. Inherited by DataTableBody and ScrollableTableBody.
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
	 * Tags a row that cannot carry the data-row-key attribute itself.
	 *
	 * A <div> is not valid inside <tbody>, so the list wrapper is not
	 * used here. A Component row is left unwrapped and the attribute is
	 * added to its root layout when it renders (its root is normally the
	 * <tr>); any other untagged layout is wrapped in a <tr>.
	 *
	 * @param {object} rowLayout
	 * @param {string} keyValue
	 * @returns {object}
	 */
	wrapRow(rowLayout, keyValue)
	{
		if (rowLayout instanceof Component)
		{
			// @ts-ignore
			const prepareLayout = rowLayout.prepareLayout;
			// @ts-ignore
			rowLayout.prepareLayout = function()
			{
				const layout = prepareLayout.call(this);
				if (layout && typeof layout === 'object')
				{
					layout['data-row-key'] = keyValue;
				}
				return layout;
			};
			return rowLayout;
		}

		return Tr({
			'data-row-key': keyValue
		}, [rowLayout]);
	}

	/**
	 * Generates skeleton rows for the table.
	 *
	 * @returns {Array<object>}
	 */
	generateSkeletonRows()
	{
		// @ts-ignore
		const skeletonConfig = this.skeleton;

		// An explicit count wins; otherwise size the skeleton to the page.
		// @ts-ignore
		const skeletonCount = getSkeletonCount(skeletonConfig, this.limit, 5);
		const customRowFunction = (skeletonConfig && typeof skeletonConfig === 'object')
			? (skeletonConfig.row || null)
			: null;

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
	 * Updates hasItems and syncs the empty state row right away.
	 *
	 * The row lives inside the tbody, so a reactive rebuild of the rows
	 * can remove it while hasItems keeps its value (no publish). Syncing
	 * here keeps the row in step with every row mutation.
	 *
	 * @returns {void}
	 */
	updateHasItems()
	{
		// @ts-ignore
		this.awaitingData = false;
		// @ts-ignore
		super.updateHasItems();
		// @ts-ignore
		this.toggleEmptyState(this.data.get('hasItems') === false);
	}

	/**
	 * Returns the onSet watcher that shows the empty state row, or null
	 * when no emptyState is configured.
	 *
	 * @returns {Array<any>|null}
	 */
	getEmptyStateWatcher()
	{
		// @ts-ignore
		if (typeof this.emptyState !== 'function')
		{
			return null;
		}

		return ['hasItems', (hasItems, ele) =>
		{
			this.toggleEmptyState(hasItems === false, ele);
		}];
	}

	/**
	 * Resolves the empty state colspan: the columnCount prop, else the
	 * number of header cells in the table, else null (unknown).
	 *
	 * @param {HTMLElement} container
	 * @returns {number|null}
	 */
	getEmptyStateColspan(container)
	{
		// @ts-ignore
		const columnCount = Number(this.columnCount);
		if (Number.isFinite(columnCount) && columnCount > 0)
		{
			return columnCount;
		}

		const table = (container && typeof container.closest === 'function')? container.closest('table') : null;
		const headerRow = (table)? table.querySelector('thead tr') : null;
		return (headerRow && headerRow.children.length > 0)? headerRow.children.length : null;
	}

	/**
	 * Adds or removes the empty state row.
	 *
	 * Data-fetching bodies set `awaitingData` until their first response
	 * so an empty body that is still loading never shows the empty state.
	 *
	 * @param {boolean} show
	 * @param {HTMLElement} [container]
	 * @returns {void}
	 */
	toggleEmptyState(show, container)
	{
		// @ts-ignore
		const tbody = container || this.listContainer;
		// @ts-ignore
		if (!tbody || typeof this.emptyState !== 'function')
		{
			return;
		}

		// @ts-ignore
		const current = this.emptyStateRow || null;
		const isShown = (current !== null && current.parentNode === tbody);

		// @ts-ignore
		if (show && this.awaitingData !== true)
		{
			if (isShown)
			{
				return;
			}

			const colspan = this.getEmptyStateColspan(tbody);
			const layout = Tr({ class: 'empty-state-row', 'data-empty-state': 'true' }, [
				// @ts-ignore
				Td({ colspan, class: 'empty-state-cell' }, [this.emptyState()])
			]);

			// @ts-ignore
			const frag = Builder.build(layout, null, this);
			const row = frag.firstElementChild;
			tbody.appendChild(frag);
			// @ts-ignore
			this.emptyStateRow = row;

			/**
			 * During the first render the tbody is not in its table yet,
			 * so the header cells can only be counted once it is placed.
			 */
			if (colspan === null && row)
			{
				queueMicrotask(() =>
				{
					const count = this.getEmptyStateColspan(tbody);
					const cell = row.firstElementChild;
					if (count !== null && cell)
					{
						cell.setAttribute('colspan', String(count));
					}
				});
			}
			return;
		}

		if (isShown)
		{
			ChildHelper.remove(current);
		}
		// @ts-ignore
		this.emptyStateRow = null;
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
			/**
			 * The explicit-data form with scope=false skips the per-row
			 * scoped Data allocation (a full Data instance plus two link
			 * subscriptions per item key) that row() never uses. Those
			 * scoped sources are not released on rebuild, so each rebuild
			 * added subscriptions to this data that every later publish
			 * had to walk.
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