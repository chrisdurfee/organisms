import { Div, Td, Tr } from '@base-framework/atoms';
import { Component, Data } from '@base-framework/base';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { List } from '../src/lists/list.js';
import { ScrollableContainer } from '../src/lists/scrollable-container.js';
import { ScrollableList } from '../src/lists/scrollable-list.js';
import { TableBody } from '../src/tables/table-body.js';
import { createXhrData, flush, makeRows, renderPage, resetBody } from './helpers.js';

afterEach(() =>
{
	resetBody();
});

describe('List.prepend', () =>
{
	it('passes each row its final data index', () =>
	{
		const indexes = [];
		const rowItem = vi.fn((row, index) =>
		{
			indexes.push([row.id, index]);
			return Div({ class: 'row', text: String(row.id) });
		});

		const { page } = renderPage([
			new List({ cache: 'list', key: 'id', rowItem, isDynamic: true, linkParent: false })
		]);

		// @ts-ignore
		const list = page.list;
		list.append(makeRows(10, 2));
		indexes.length = 0;

		list.prepend([{ id: 3 }, { id: 2 }, { id: 1 }]);

		const rows = list.getRows();
		for (const [id, index] of indexes)
		{
			expect(rows[index].id).toBe(id);
		}
		expect(indexes.map(([, index]) => index).sort()).toEqual([0, 1, 2]);
	});
});

describe('List hasItems linking', () =>
{
	it('keeps sibling standalone lists independent', async () =>
	{
		const emptyState = () => Div({ class: 'empty' });
		const rowItem = (row) => Div({ class: 'row', text: String(row.id) });

		const { page, container } = renderPage([
			Div({ class: 'a' }, [new List({ cache: 'listA', key: 'id', rowItem, emptyState, items: [] })]),
			Div({ class: 'b' }, [new List({ cache: 'listB', key: 'id', rowItem, emptyState, items: makeRows(1, 2) })])
		], {
			/**
			 * @returns {Data}
			 */
			setData: () => new Data({ hasItems: null })
		});
		// @ts-ignore
		page.listA.setRows([]);
		// @ts-ignore
		page.listB.setRows(makeRows(1, 2));
		await flush();

		expect(container.querySelector('.a .empty')).not.toBeNull();
		expect(container.querySelector('.b .empty')).toBeNull();

		// Emptying one list must not show the other's empty state.
		// @ts-ignore
		page.listB.setRows([]);
		// @ts-ignore
		page.listA.append(makeRows(5, 1));
		await flush();

		expect(container.querySelector('.a .empty')).toBeNull();
		expect(container.querySelector('.b .empty')).not.toBeNull();
	});

	it('still links a single child list to the parent hasItems', async () =>
	{
		const { page } = renderPage([
			new List({ cache: 'list', key: 'id', rowItem: (row) => Div({ text: String(row.id) }) })
		], {
			/**
			 * @returns {Data}
			 */
			setData: () => new Data({ hasItems: null })
		});

		// @ts-ignore
		page.list.append(makeRows(1, 2));
		await flush();
		expect(page.data.get('hasItems')).toBe(true);

		// @ts-ignore
		page.list.setRows([]);
		await flush();
		expect(page.data.get('hasItems')).toBe(false);
	});

	it('links a named parent key when linkParent is a string', async () =>
	{
		const { page } = renderPage([
			new List({ cache: 'listA', key: 'id', linkParent: 'usersHasItems', rowItem: (row) => Div({ text: String(row.id) }) }),
			new List({ cache: 'listB', key: 'id', linkParent: 'teamsHasItems', rowItem: (row) => Div({ text: String(row.id) }) })
		], {
			/**
			 * @returns {Data}
			 */
			setData: () => new Data({ usersHasItems: null, teamsHasItems: null })
		});

		// @ts-ignore
		page.listA.append(makeRows(1, 1));
		// @ts-ignore
		page.listB.setRows([]);
		await flush();

		expect(page.data.get('usersHasItems')).toBe(true);
		expect(page.data.get('teamsHasItems')).toBe(false);
	});
});

describe('TableBody rows', () =>
{
	/**
	 * A row component rendering its own table row.
	 */
	class RowComponent extends Component
	{
		/**
		 * @returns {object}
		 */
		render()
		{
			// @ts-ignore
			return Tr({ class: 'component-row' }, [Td({ text: String(this.row.id) })]);
		}
	}

	it('does not wrap component rows in a div', async () =>
	{
		const { container, page } = renderPage([
			{
				tag: 'table',
				children: [
					new TableBody({
						cache: 'list',
						key: 'id',
						items: makeRows(1, 2),
						rowItem: (row) => new RowComponent({ row })
					})
				]
			}
		]);
		await flush();

		const tbody = container.querySelector('tbody');
		expect(tbody.querySelector('div')).toBeNull();
		const rows = Array.from(tbody.children);
		expect(rows.map((el) => el.tagName)).toEqual(['TR', 'TR']);
		expect(rows.map((el) => el.getAttribute('data-row-key'))).toEqual(['1', '2']);

		// Key lookups still find the rows, so delete works.
		// @ts-ignore
		page.list.delete(1);
		expect(tbody.children.length).toBe(1);
	});

	it('wraps untagged layouts in a tr', async () =>
	{
		const { container } = renderPage([
			{
				tag: 'table',
				children: [
					new TableBody({
						cache: 'list',
						key: 'id',
						items: makeRows(1, 1),
						rowItem: (row) => ({ children: [Td({ text: String(row.id) })], tag: undefined })
					})
				]
			}
		]);
		await flush();

		const tbody = container.querySelector('tbody');
		expect(tbody.firstElementChild.tagName).toBe('TR');
		expect(tbody.firstElementChild.getAttribute('data-row-key')).toBe('1');
	});
});

describe('Resumed rows revalidation', () =>
{
	it('keeps the resumed rows when the revalidation request fails', async () =>
	{
		const { data, requests } = createXhrData();
		const emptyState = () => Div({ class: 'empty' });
		const rowItem = (row) => Div({ class: 'row', text: String(row.id) });
		const { page, container } = renderPage([
			ScrollableList({ cache: 'list', key: 'id', data, rowItem, limit: 3, persist: true, emptyState, items: makeRows(1, 4) })
		]);

		// The list resumed 4 rows, so one request covers the window.
		expect(requests.length).toBe(1);
		expect(requests[0].limit).toBe(4);
		requests[0].fail();
		await flush();

		// @ts-ignore
		expect(page.list.getRows().length).toBe(4);
		expect(container.querySelector('.empty')).toBeNull();

		// Pagination continues after the resumed window.
		window.dispatchEvent(new Event('scroll'));
		await flush();
		expect(requests.length).toBe(2);
		expect(requests[1].offset).toBe(4);
	});
});

describe('ScrollableContainer', () =>
{
	it('passes xhrMethod through to the default fetch callback', () =>
	{
		const { data, requests } = createXhrData('feed');
		renderPage([
			ScrollableContainer({ data, xhrMethod: 'feed' }, [
				new List({ cache: 'list', key: 'id', rowItem: (row) => Div({ text: String(row.id) }), isDynamic: true, linkParent: false })
			])
		]);

		expect(requests.length).toBe(1);
	});
});

describe('Newest id tracking', () =>
{
	it('uses the list key and compares numeric ids numerically', async () =>
	{
		const { data, requests } = createXhrData();
		const rowItem = (row) => Div({ class: 'row', text: String(row.uid) });
		const { page } = renderPage([
			ScrollableList({ cache: 'list', key: 'uid', data, rowItem, limit: 3 })
		]);

		requests[0].respond([{ uid: '10' }, { uid: '9' }, { uid: '8' }]);
		await flush();

		// @ts-ignore
		page.list.fetchNew();
		expect(requests[1].since).toBe('10');

		requests[1].respond([{ uid: '12' }, { uid: '11' }]);
		await flush();

		// @ts-ignore
		page.list.fetchNew();
		expect(requests[2].since).toBe('12');
	});
});
