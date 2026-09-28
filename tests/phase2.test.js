import { Div, Td, Tr } from '@base-framework/atoms';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BiDirectionalContainer } from '../src/lists/bi-directional-container.js';
import { DataList } from '../src/lists/data-list.js';
import { DynamicList } from '../src/lists/dynamic-list.js';
import { List } from '../src/lists/list.js';
import { mergeResumedWindow } from '../src/lists/scroll-utils.js';
import { ScrollableContainer } from '../src/lists/scrollable-container.js';
import { ScrollableList } from '../src/lists/scrollable-list.js';
import { NavLink } from '../src/router/nav-link.js';
import { DataTableBody } from '../src/tables/data-table-body.js';
import { ScrollableTableBody } from '../src/tables/scrollable-table-body.js';
import { TableBody } from '../src/tables/table-body.js';
import { createXhrData, flush, makeRows, renderPage, resetBody } from './helpers.js';

/**
 * Renders a row with its id and name as text.
 *
 * @param {object} row
 * @returns {object}
 */
const rowItem = (row) => Div({ class: 'row', text: `${row.id}:${row.name}` });

/**
 * Renders a table row with its id and name.
 *
 * @param {object} row
 * @returns {object}
 */
const tableRow = (row) => Tr({ class: 'row' }, [Td({ text: `${row.id}:${row.name}` })]);

/**
 * Reads the rendered row texts.
 *
 * @param {HTMLElement} container
 * @returns {Array<string>}
 */
const renderedRows = (container) =>
	Array.from(container.querySelectorAll('.row')).map((el) => el.textContent);

/**
 * A skeleton row layout.
 *
 * @param {number} index
 * @returns {object}
 */
const skeletonRow = (index) => Div({ class: 'skeleton', text: String(index) });

afterEach(() =>
{
	resetBody();
	vi.useRealTimers();
});

describe('Skeleton rows sized to the page', () =>
{
	it('defaults a list skeleton to min(limit, 10) rows', () =>
	{
		const { data } = createXhrData();
		const { container } = renderPage([
			DataList({ cache: 'a', key: 'id', data, rowItem, limit: 4, skeleton: { row: skeletonRow } }),
			DataList({ cache: 'b', key: 'id', data, rowItem, limit: 25, skeleton: { row: skeletonRow } })
		]);

		const lists = container.querySelectorAll('.list');
		expect(lists[0].querySelectorAll('.skeleton').length).toBe(4);
		expect(lists[1].querySelectorAll('.skeleton').length).toBe(10);
	});

	it('keeps an explicit skeleton count and the default without a limit', () =>
	{
		const { container } = renderPage([
			new List({ cache: 'a', key: 'id', rowItem, limit: 20, skeleton: { number: 2, row: skeletonRow } }),
			new List({ cache: 'b', key: 'id', rowItem, skeleton: { row: skeletonRow } })
		]);

		const lists = container.querySelectorAll('.list');
		expect(lists[0].querySelectorAll('.skeleton').length).toBe(2);
		expect(lists[1].querySelectorAll('.skeleton').length).toBe(3);
	});

	it('sizes a table body skeleton to its limit', () =>
	{
		const { data } = createXhrData();
		const { container } = renderPage([
			{ tag: 'table', children: [
				new DataTableBody({ cache: 'list', key: 'id', tableData: data, rowItem: tableRow, limit: 3, skeleton: true, columnCount: 2 })
			] }
		]);

		expect(container.querySelectorAll('tbody tr').length).toBe(3);
	});
});

describe('List minHeight while loading', () =>
{
	it('reserves the height until rows render', async () =>
	{
		const { data, requests } = createXhrData();
		const { container } = renderPage([
			DataList({ cache: 'list', key: 'id', data, rowItem, minHeight: '240px' })
		]);

		const wrapper = /** @type {HTMLElement} */ (container.querySelector('.list').parentElement);
		expect(wrapper.style.minHeight).toBe('240px');

		requests[0].respond(makeRows(1, 2));
		await flush();
		expect(wrapper.style.minHeight).toBe('');
	});

	it('removes the reserved height when the empty state renders', async () =>
	{
		const { data, requests } = createXhrData();
		const emptyState = () => Div({ class: 'empty' });
		const { container } = renderPage([
			DataList({ cache: 'list', key: 'id', data, rowItem, minHeight: '10rem', emptyState })
		]);

		const wrapper = /** @type {HTMLElement} */ (container.querySelector('.list').parentElement);
		expect(wrapper.style.minHeight).toBe('10rem');

		requests[0].respond([]);
		await flush();
		expect(wrapper.style.minHeight).toBe('');
		expect(container.querySelector('.empty')).not.toBeNull();
	});

	it('is off by default', () =>
	{
		const { data } = createXhrData();
		const { container } = renderPage([
			DataList({ cache: 'list', key: 'id', data, rowItem })
		]);

		const wrapper = /** @type {HTMLElement} */ (container.querySelector('.list').parentElement);
		expect(wrapper.style.minHeight).toBe('');
	});
});

describe('TableBody empty state', () =>
{
	it('renders the empty state in one full-width row', async () =>
	{
		const emptyState = () => Div({ class: 'empty', text: 'Nothing here' });
		const { container } = renderPage([
			{ tag: 'table', children: [
				new TableBody({ cache: 'list', key: 'id', items: [], rowItem: tableRow, emptyState, columnCount: 4 })
			] }
		]);
		await flush();

		const rows = container.querySelectorAll('tbody tr');
		expect(rows.length).toBe(1);
		const cell = rows[0].querySelector('td');
		expect(cell.getAttribute('colspan')).toBe('4');
		expect(cell.querySelector('.empty')).not.toBeNull();
	});

	it('uses the header cell count when no columnCount is given', async () =>
	{
		const emptyState = () => Div({ class: 'empty' });
		const { container } = renderPage([
			{ tag: 'table', children: [
				{ tag: 'thead', children: [Tr([{ tag: 'th' }, { tag: 'th' }, { tag: 'th' }])] },
				new TableBody({ cache: 'list', key: 'id', items: [], rowItem: tableRow, emptyState })
			] }
		]);
		await flush();

		expect(container.querySelector('tbody td').getAttribute('colspan')).toBe('3');
	});

	it('waits for the first response and follows the rows after it', async () =>
	{
		const { data, requests } = createXhrData();
		const emptyState = () => Div({ class: 'empty' });
		const { container, page } = renderPage([
			{ tag: 'table', children: [
				new DataTableBody({ cache: 'list', key: 'id', tableData: data, rowItem: tableRow, emptyState, columnCount: 2 })
			] }
		]);
		await flush();

		// Still loading: no empty state.
		expect(container.querySelector('.empty')).toBeNull();

		requests[0].respond([]);
		await flush();
		expect(container.querySelectorAll('.empty').length).toBe(1);

		// @ts-ignore
		page.list.refresh();
		requests[1].respond(makeRows(1, 2));
		await flush();
		expect(container.querySelector('.empty')).toBeNull();
		expect(renderedRows(container)).toEqual(['1:Row 1', '2:Row 2']);
	});
});

/**
 * Builds rows with changed names.
 *
 * @param {Array<number>} ids
 * @param {string} [suffix]
 * @returns {Array<object>}
 */
const rowsFor = (ids, suffix = '') => ids.map((id) => ({ id, name: `Row ${id}${suffix}` }));

describe('Resume revalidates in place for every container', () =>
{
	it('ScrollableContainer merges instead of resetting', async () =>
	{
		const { data, requests } = createXhrData();
		const { container, page } = renderPage([
			ScrollableContainer({ data, limit: 3 }, [
				new List({ cache: 'list', key: 'id', rowItem, isDynamic: true, linkParent: false, persist: true, items: makeRows(1, 4) })
			])
		]);

		const kept = container.querySelector('[data-row-key="3"]');
		expect(requests.length).toBe(1);
		expect(requests[0].offset).toBe(0);
		expect(requests[0].limit).toBe(4);

		// Row 1 removed, row 2 changed, row 0 added; 3 and 4 unchanged.
		requests[0].respond([{ id: 0, name: 'Row 0' }, { id: 2, name: 'Row 2 edited' }, { id: 3, name: 'Row 3' }, { id: 4, name: 'Row 4' }]);
		await flush();

		expect(renderedRows(container)).toEqual(['0:Row 0', '2:Row 2 edited', '3:Row 3', '4:Row 4']);
		// Unchanged rows keep their DOM node (no reset, no flash).
		expect(container.querySelector('[data-row-key="3"]')).toBe(kept);

		// Pagination continues after the merged rows.
		window.dispatchEvent(new Event('scroll'));
		await flush();
		expect(requests.length).toBe(2);
		expect(requests[1].offset).toBe(4);
		// @ts-ignore
		expect(page.list.getRows().length).toBe(4);
	});

	it('DynamicList revalidates resumed rows', async () =>
	{
		const { data, requests } = createXhrData();
		const { container } = renderPage([
			DynamicList({ cache: 'list', key: 'id', data, rowItem, limit: 3, persist: true, items: makeRows(1, 3) })
		]);

		expect(renderedRows(container).length).toBe(3);
		requests[0].respond(rowsFor([1, 2, 3], ' new'));
		await flush();
		expect(renderedRows(container)).toEqual(['1:Row 1 new', '2:Row 2 new', '3:Row 3 new']);
	});

	it("BiDirectional 'up' keeps the resumed rows and appends newer ones at the bottom", async () =>
	{
		const { data, requests } = createXhrData();
		const { container } = renderPage([
			BiDirectionalContainer({ data, limit: 3, scrollDirection: 'up' }, [
				// List order for 'up' is oldest first.
				new List({ cache: 'list', key: 'id', rowItem, isDynamic: true, linkParent: false, persist: true, items: rowsFor([1, 2, 3]) })
			])
		]);

		const kept = container.querySelector('[data-row-key="2"]');
		expect(requests.length).toBe(1);
		expect(requests[0].limit).toBe(3);

		// Server order is newest first.
		requests[0].respond(rowsFor([4, 3, 2]));
		await flush();

		// Row 4 is new; the window reached row 2, row 1 is beyond it and stays.
		expect(renderedRows(container)).toEqual(['1:Row 1', '2:Row 2', '3:Row 3', '4:Row 4']);
		expect(container.querySelector('[data-row-key="2"]')).toBe(kept);
	});

	it('DataTableBody revalidates resumed rows in place', async () =>
	{
		const { data, requests } = createXhrData();
		const { container } = renderPage([
			{ tag: 'table', children: [
				new DataTableBody({ cache: 'list', key: 'id', tableData: data, rowItem: tableRow, limit: 2, persist: true, items: rowsFor([1, 2, 3]) })
			] }
		]);

		expect(requests.length).toBe(1);
		expect(requests[0].limit).toBe(3);
		requests[0].respond(rowsFor([1, 3], ' x'));
		await flush();

		// Row 2 was inside the refreshed window and is gone.
		expect(renderedRows(container)).toEqual(['1:Row 1 x', '3:Row 3 x']);
	});

	it('ScrollableTableBody revalidates resumed rows in place', async () =>
	{
		const { data, requests } = createXhrData();
		const { container } = renderPage([
			{ tag: 'table', children: [
				new ScrollableTableBody({ cache: 'list', key: 'id', tableData: data, rowItem: tableRow, limit: 2, persist: true, items: rowsFor([1, 2]) })
			] }
		]);

		expect(requests.length).toBe(1);
		requests[0].respond(rowsFor([1, 2], ' y'));
		await flush();
		expect(renderedRows(container)).toEqual(['1:Row 1 y', '2:Row 2 y']);
	});

	it('keeps the rows when the revalidation fails', async () =>
	{
		const { data, requests } = createXhrData();
		const { container } = renderPage([
			{ tag: 'table', children: [
				new DataTableBody({ cache: 'list', key: 'id', tableData: data, rowItem: tableRow, limit: 2, persist: true, items: rowsFor([1, 2]) })
			] }
		]);

		requests[0].fail();
		await flush();
		expect(renderedRows(container)).toEqual(['1:Row 1', '2:Row 2']);
	});
});

describe('Revalidation in capped pages', () =>
{
	it('caps the request at max(limit, 50) and keeps the rows beyond it', async () =>
	{
		const { data, requests } = createXhrData();
		const { container, page } = renderPage([
			ScrollableList({ cache: 'list', key: 'id', data, rowItem, limit: 10, persist: true, items: makeRows(1, 60) })
		]);

		expect(requests[0].limit).toBe(50);
		const fresh = makeRows(1, 50).map((row) => ({ ...row, name: row.name + ' new' }));
		requests[0].respond(fresh);
		await flush();

		const rows = renderedRows(container);
		expect(rows.length).toBe(60);
		expect(rows[49]).toBe('50:Row 50 new');
		expect(rows[50]).toBe('51:Row 51');

		window.dispatchEvent(new Event('scroll'));
		await flush();
		expect(requests[1].offset).toBe(60);
		// @ts-ignore
		expect(page.list.getRows().length).toBe(60);
	});

	it('honours the revalidateLimit prop', () =>
	{
		const { data, requests } = createXhrData();
		renderPage([
			DataList({ cache: 'list', key: 'id', data, rowItem, limit: 10, revalidateLimit: 5, persist: true, items: makeRows(1, 20) })
		]);

		expect(requests[0].limit).toBe(5);
	});

	it('merges only within the window the response reaches', () =>
	{
		const resumed = rowsFor([1, 2, 3, 4, 5]);
		// A capped response reaching row 3: row 2 was removed, row 9 added.
		const merged = mergeResumedWindow(resumed, rowsFor([9, 1, 3]), 'id', false);
		expect(merged.map((row) => row.id)).toEqual([9, 1, 3, 4, 5]);

		// A response known to reach the end covers every resumed row.
		const end = mergeResumedWindow(resumed, rowsFor([1, 3]), 'id', true);
		expect(end.map((row) => row.id)).toEqual([1, 3]);
	});
});

describe('Dynamic time timers', () =>
{
	/**
	 * Sets document.hidden and dispatches visibilitychange.
	 *
	 * @param {boolean} hidden
	 * @returns {void}
	 */
	const setHidden = (hidden) =>
	{
		Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
		document.dispatchEvent(new Event('visibilitychange'));
	};

	it('aligns to the wall-clock minute and pauses while hidden', async () =>
	{
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 0, 1, 10, 0, 45));
		vi.resetModules();
		const { DynamicTime } = await import('../src/time/dynamic-time.js');

		const filter = vi.fn((value) => value);
		const { container } = renderPage([
			new DynamicTime({ dateTime: 'now', filter })
		]);
		const calls = () => filter.mock.calls.length;
		const initial = calls();

		// 15s to the next minute boundary, not 60s.
		vi.advanceTimersByTime(15000);
		await vi.advanceTimersByTimeAsync(0);
		expect(calls()).toBe(initial + 1);

		setHidden(true);
		await vi.advanceTimersByTimeAsync(180000);
		expect(calls()).toBe(initial + 1);

		// Visible again: tick immediately.
		setHidden(false);
		await vi.advanceTimersByTimeAsync(0);
		expect(calls()).toBe(initial + 2);

		container.remove();
		// @ts-ignore
		delete document.hidden;
	});
});

describe('NavLink active pattern', () =>
{
	it('compiles the pattern once per path', () =>
	{
		const link = new NavLink({ href: '/users', text: 'Users' });
		const first = link.getActivePattern('/users');
		expect(link.getActivePattern('/users')).toBe(first);
		expect(first.test('/users/5')).toBe(true);
		expect(first.test('/users-admin')).toBe(false);

		const next = link.getActivePattern('/teams');
		expect(next).not.toBe(first);
		expect(next.test('/teams')).toBe(true);
	});

	it('does not expose the dead getLinkPath', () =>
	{
		const link = new NavLink({ href: '/a' });
		// @ts-ignore
		expect(link.getLinkPath).toBeUndefined();
	});
});
