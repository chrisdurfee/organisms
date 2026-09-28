import { Div } from '@base-framework/atoms';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataList } from '../src/lists/data-list.js';
import { ScrollableList } from '../src/lists/scrollable-list.js';
import { createXhrData, flush, makeRows, renderPage, resetBody } from './helpers.js';

/**
 * Renders a row with its id as text.
 *
 * @param {object} row
 * @returns {object}
 */
const rowItem = (row) => Div({ class: 'row', text: String(row.id) });

/**
 * Reads the rendered row ids.
 *
 * @param {HTMLElement} container
 * @returns {Array<string>}
 */
const renderedIds = (container) =>
	Array.from(container.querySelectorAll('.row')).map((el) => el.textContent);

afterEach(() =>
{
	resetBody();
});

describe('DataList fetching', () =>
{
	it('renders the first page', async () =>
	{
		const { data, requests } = createXhrData();
		const { page, container } = renderPage([
			DataList({ cache: 'list', key: 'id', data, rowItem, limit: 5 })
		]);

		expect(requests.length).toBe(1);
		requests[0].respond(makeRows(1, 3));
		await flush();

		// @ts-ignore
		expect(page.list.getRows().length).toBe(3);
		expect(renderedIds(container)).toEqual(['1', '2', '3']);
	});

	it('keeps the current rows when a refresh fails', async () =>
	{
		const emptyState = vi.fn(() => Div({ class: 'empty' }));
		const { data, requests } = createXhrData();
		const { page, container } = renderPage([
			DataList({ cache: 'list', key: 'id', data, rowItem, limit: 5, emptyState })
		]);

		requests[0].respond(makeRows(1, 3));
		await flush();

		// @ts-ignore
		page.list.refresh();
		expect(requests.length).toBe(2);
		requests[1].fail();
		await flush();

		// @ts-ignore
		expect(page.list.getRows().length).toBe(3);
		expect(renderedIds(container)).toEqual(['1', '2', '3']);
		expect(container.querySelector('.empty')).toBeNull();

		// The refresh can be retried after the failure.
		// @ts-ignore
		page.list.refresh();
		expect(requests.length).toBe(3);
		requests[2].respond(makeRows(10, 2));
		await flush();
		expect(renderedIds(container)).toEqual(['10', '11']);
	});

	it('drops the response of a superseded refresh', async () =>
	{
		const { data, requests } = createXhrData();
		const { page, container } = renderPage([
			DataList({ cache: 'list', key: 'id', data, rowItem, limit: 5 })
		]);

		// Two refreshes in flight: only the last one may apply.
		// @ts-ignore
		page.list.refresh();
		expect(requests.length).toBe(2);

		requests[1].respond(makeRows(20, 2));
		requests[0].respond(makeRows(1, 3));
		await flush();

		expect(renderedIds(container)).toEqual(['20', '21']);
	});

	it('honours the offset prop on the first request and after refresh', async () =>
	{
		const { data, requests } = createXhrData();
		const { page } = renderPage([
			DataList({ cache: 'list', key: 'id', data, rowItem, limit: 5, offset: 40 })
		]);

		expect(requests[0].offset).toBe(40);
		requests[0].respond(makeRows(1, 5));
		await flush();

		// @ts-ignore
		page.list.refresh();
		expect(requests[1].offset).toBe(40);
	});

	it('ignores a response that arrives after the list was destroyed', async () =>
	{
		const { data, requests } = createXhrData();
		const { page, container } = renderPage([
			DataList({ cache: 'list', key: 'id', data, rowItem, limit: 5 })
		]);

		// @ts-ignore
		const list = page.list;
		const reset = vi.spyOn(list, 'reset');
		page.destroy();

		requests[0].respond(makeRows(1, 3));
		await flush();

		expect(reset).not.toHaveBeenCalled();
		expect(container.querySelectorAll('.row').length).toBe(0);
	});

	it('uses xhrMethod', async () =>
	{
		const { data, requests } = createXhrData('search');
		renderPage([
			DataList({ cache: 'list', key: 'id', data, rowItem, xhrMethod: 'search' })
		]);

		expect(requests.length).toBe(1);
	});
});

describe('ScrollableList fetching', () =>
{
	it('keeps pagination alive after a failed page', async () =>
	{
		const { data, requests } = createXhrData();
		const { page, container } = renderPage([
			ScrollableList({ cache: 'list', key: 'id', data, rowItem, limit: 3 })
		]);

		requests[0].respond(makeRows(1, 3));
		await flush();

		// jsdom reports zero sizes, so every scroll is "near the bottom".
		window.dispatchEvent(new Event('scroll'));
		await flush();
		expect(requests.length).toBe(2);
		expect(requests[1].offset).toBe(3);

		requests[1].fail();
		await flush();

		// @ts-ignore
		expect(page.list.getRows().length).toBe(3);

		// The failed page did not end pagination and the flag was released.
		window.dispatchEvent(new Event('scroll'));
		await flush();
		expect(requests.length).toBe(3);
		expect(requests[2].offset).toBe(3);

		requests[2].respond(makeRows(4, 3));
		await flush();
		expect(renderedIds(container)).toEqual(['1', '2', '3', '4', '5', '6']);
	});

	it('ignores scroll events while its page is detached', async () =>
	{
		const { data, requests } = createXhrData();
		const { page, container } = renderPage([
			ScrollableList({ cache: 'list', key: 'id', data, rowItem, limit: 3 })
		]);

		requests[0].respond(makeRows(1, 3));
		await flush();

		/* a keep-alive route detaches the page without destroying it */
		const panel = page.panel;
		panel.remove();
		window.dispatchEvent(new Event('scroll'));
		await flush();
		expect(requests.length).toBe(1);

		container.appendChild(panel);
		window.dispatchEvent(new Event('scroll'));
		await flush();
		expect(requests.length).toBe(2);
	});

	it('does not run a scroll load during a refresh or duplicate page one', async () =>
	{
		const { data, requests } = createXhrData();
		const { page, container } = renderPage([
			ScrollableList({ cache: 'list', key: 'id', data, rowItem, limit: 3 })
		]);

		requests[0].respond(makeRows(1, 3));
		await flush();

		// @ts-ignore
		page.list.refresh();
		expect(requests.length).toBe(2);

		// A scroll while the refresh is in flight must not start a load.
		window.dispatchEvent(new Event('scroll'));
		await flush();
		expect(requests.length).toBe(2);

		requests[1].respond(makeRows(1, 3));
		await flush();

		expect(renderedIds(container)).toEqual(['1', '2', '3']);

		// Pagination continues from the refreshed page, not a doubled offset.
		window.dispatchEvent(new Event('scroll'));
		await flush();
		expect(requests.length).toBe(3);
		expect(requests[2].offset).toBe(3);
	});

	it('drops a scroll page that was in flight when refresh started', async () =>
	{
		const { data, requests } = createXhrData();
		const { page, container } = renderPage([
			ScrollableList({ cache: 'list', key: 'id', data, rowItem, limit: 3 })
		]);

		requests[0].respond(makeRows(1, 3));
		await flush();

		window.dispatchEvent(new Event('scroll'));
		await flush();
		expect(requests.length).toBe(2);

		// @ts-ignore
		page.list.refresh();
		requests[2].respond(makeRows(1, 3));
		requests[1].respond(makeRows(4, 3));
		await flush();

		expect(renderedIds(container)).toEqual(['1', '2', '3']);
	});

	it('does not land a late page in a replacement list with the same cache name', async () =>
	{
		const first = createXhrData();
		const { page } = renderPage([
			ScrollableList({ cache: 'list', key: 'id', data: first.data, rowItem, limit: 3 })
		]);

		// @ts-ignore
		const oldList = page.list;
		oldList.destroy();

		const second = createXhrData();
		const replacement = renderPage([
			ScrollableList({ cache: 'list', key: 'id', data: second.data, rowItem, limit: 3 })
		]);

		// Point the old container's parent at the replacement list.
		// @ts-ignore
		page.list = replacement.page.list;
		const append = vi.spyOn(replacement.page.list, 'append');

		first.requests[0].respond(makeRows(1, 3));
		await flush();

		expect(append).not.toHaveBeenCalled();
	});

	it('shows the rows (not the skeleton) after the first page, and clears showSkeleton on an empty page', async () =>
	{
		const { data, requests } = createXhrData();
		const skeleton = { number: 2, row: () => Div({ class: 'skeleton' }) };
		const emptyState = () => Div({ class: 'empty' });
		const { page, container } = renderPage([
			ScrollableList({ cache: 'list', key: 'id', data, rowItem, limit: 3, skeleton, emptyState })
		]);

		expect(container.querySelectorAll('.skeleton').length).toBe(2);
		requests[0].respond([]);
		await flush();

		// @ts-ignore
		expect(page.list.data.get('showSkeleton')).toBe(false);
		expect(container.querySelectorAll('.skeleton').length).toBe(0);
		expect(container.querySelector('.empty')).not.toBeNull();
	});
});
