import { TableBody } from './table-body.js';

/**
 * This will create the table body.
 *
 * @param {object} props
 * @returns {object}
 */
export const DataTableBody = ({ key, rows, selectRow, rowItem, emptyState, skeleton, columnCount }) => (
	new TableBody({
		cache: 'list',
		key,
		items: rows,
		rowItem: (row) => rowItem(row, selectRow),
		class: 'divide-y divide-border',
		emptyState,
		skeleton,
		columnCount
	})
);