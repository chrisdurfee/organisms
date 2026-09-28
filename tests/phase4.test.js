import { Div, Table, Td, Tr } from '@base-framework/atoms';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BiDirectionalContainer from '../src/lists/bi-directional-container.js';
import { DataList } from '../src/lists/data-list.js';
import { DynamicList } from '../src/lists/dynamic-list.js';
import { List } from '../src/lists/list.js';
import { ScrollableList } from '../src/lists/scrollable-list.js';
import { TableBody } from '../src/tables/table-body.js';
import { List as LegacyList } from './fixtures/legacy-list.js';
import { createXhrData, flush, makeRows, renderPage, resetBody } from './helpers.js';

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

afterEach(() =>
{
	resetBody();
});

/**
 * Renders a row with every field that can change, so the DOM snapshot
 * shows whether a row was rebuilt with the new data.
 *
 * @param {object} row
 * @returns {object}
 */
const rowItem = (row) => Div({ class: 'row', text: `${row.id}:${row.name}:${row.day ?? ''}` });

/**
 * @returns {object}
 */
const createDivider = () => ({
	itemProperty: 'day',
	layout: (value) => Div({ class: 'divider', text: String(value) })
});

/**
 * Builds `count` rows grouped three per day.
 *
 * @param {number} start
 * @param {number} count
 * @returns {Array<object>}
 */
const dayRows = (start, count) =>
	Array.from({ length: count }, (_, i) => ({ id: start + i, name: `Row ${start + i}`, day: `d${Math.floor((start + i) / 3)}` }));

/**
 * A batch mixing updated, unchanged and added rows, with added rows
 * spread over several days and interleaved with the updates.
 *
 * @returns {Array<object>}
 */
const mixedBatch = () => [
	{ id: 20, name: 'Row 20', day: 'd9' },
	{ id: 1, name: 'Row 1 updated', day: 'd0' },
	{ id: 2, name: 'Row 2', day: 'd0' },
	{ id: 21, name: 'Row 21', day: 'd9' },
	{ id: 5, name: 'Row 5 updated', day: 'd7' },
	{ id: 22, name: 'Row 22', day: 'd3' },
	{ id: 0, name: 'Row 0 moved', day: 'd8' }
];

/**
 * @param {Function} ListClass
 * @param {object} props
 * @returns {object}
 */
const build = (ListClass, props) =>
{
	const { page } = renderPage([
		// @ts-ignore
		new ListClass({ cache: 'list', key: 'id', rowItem, isDynamic: true, linkParent: false, ...props })
	]);
	// @ts-ignore
	return page.list;
};

/**
 * @param {object} list
 * @returns {object}
 */
const snapshot = (list) => ({
	rows: JSON.parse(JSON.stringify(list.getRows())),
	html: list.listContainer.innerHTML
});

/**
 * Runs the same operations on the pre-Phase 4 List and the current
 * List and expects identical rows and DOM.
 *
 * @param {function} makeProps
 * @param {Array<function>} ops
 * @returns {object}
 */
const expectSameAsLegacy = (makeProps, ops) =>
{
	const legacy = build(LegacyList, makeProps());
	const current = build(List, makeProps());
	for (const op of ops)
	{
		op(legacy);
		op(current);
	}

	const expected = snapshot(legacy);
	expect(snapshot(current)).toEqual(expected);
	return expected;
};

const seedAppend = (list) => list.append(dayRows(0, 9));
const seedPrepend = (list) => list.prepend(dayRows(0, 9));

const variants = [
	{ name: 'plain', props: () => ({}) },
	{ name: 'divider', props: () => ({ divider: createDivider() }) },
	{ name: 'plain, not dynamic', props: () => ({ isDynamic: false }) },
	{ name: 'divider, not dynamic', props: () => ({ divider: createDivider(), isDynamic: false }) }
];

const scenarios = [
	{ name: 'mingle', ops: [seedAppend, (l) => l.mingle(mixedBatch())] },
	{ name: 'mingle with delete', ops: [seedAppend, (l) => l.mingle(mixedBatch(), true)] },
	{ name: 'merge append', ops: [seedAppend, (l) => l.merge(mixedBatch(), true)] },
	{ name: 'merge prepend', ops: [seedAppend, (l) => l.merge(mixedBatch(), false)] },
	{ name: 'merge prepend into a prepended list', ops: [seedPrepend, (l) => l.merge(mixedBatch(), false)] },
	{ name: 'merge append deleteIfFound', ops: [seedAppend, (l) => l.merge(mixedBatch(), true, true)] },
	{ name: 'merge prepend deleteIfFound', ops: [seedAppend, (l) => l.merge(mixedBatch(), false, true)] },
	{ name: 'merge prepend deleteIfFound (top rows removed)', ops: [seedPrepend, (l) => l.merge([{ id: 30, day: 'd1', name: 'x' }, { id: 8, day: 'd5', name: 'y' }, { id: 7, day: 'd2', name: 'z' }, { id: 6, day: 'd1', name: 'w' }], false, true)] },
	{ name: 'merge prepend deleteIfFound replacing every row, then append', ops: [
		(l) => l.prepend([{ id: 1, name: 'a', day: 'da' }, { id: 2, name: 'b', day: 'db' }]),
		(l) => l.merge([{ id: 30, name: 'x', day: 'dx' }, { id: 1, name: 'y', day: 'dy' }, { id: 2, name: 'y', day: 'dy' }], false, true),
		(l) => l.append([{ id: 40, name: 'z', day: 'da' }])
	] },
	{ name: 'merge deleteIfFound with duplicate keys', ops: [seedAppend, (l) => l.merge([...mixedBatch(), { id: 20, name: 'Row 20 again', day: 'd1' }], true, true)] },
	{ name: 'merge prepend deleteIfFound with duplicate keys', ops: [seedAppend, (l) => l.merge([...mixedBatch(), { id: 1, name: 'Row 1 again', day: 'd4' }], false, true)] },
	{ name: 'merge with duplicate added keys', ops: [seedAppend, (l) => l.merge([...mixedBatch(), { id: 21, name: 'dup', day: 'd9' }], false)] },
	{ name: 'merge into an empty list', ops: [(l) => l.merge(mixedBatch(), false)] },
	{ name: 'merge deleteIfFound into an empty list', ops: [(l) => l.merge(mixedBatch(), false, true)] },
	{ name: 'modify', ops: [seedAppend, (l) => l.modify(mixedBatch())] },
	{ name: 'modify addMissing', ops: [seedAppend, (l) => l.modify(mixedBatch(), true)] },
	{ name: 'repeated merges', ops: [seedPrepend, (l) => l.merge(dayRows(8, 6), false), (l) => l.merge(dayRows(3, 12), true, true), (l) => l.mingle(dayRows(5, 10), true)] }
];

describe('Batched mingle/merge/modify match the per-row results', () =>
{
	for (const variant of variants)
	{
		for (const scenario of scenarios)
		{
			it(`${scenario.name} (${variant.name})`, () =>
			{
				const result = expectSameAsLegacy(variant.props, scenario.ops);
				expect(result.rows.length).toBeGreaterThan(0);
			});
		}
	}
});

describe('Batched merge/mingle updates', () =>
{
	it('merge(..., deleteIfFound) removes in one pass and updates hasItems once', () =>
	{
		const list = build(List, {});
		list.append(dayRows(0, 50));

		const removeRows = vi.spyOn(list, 'removeRows');
		const updateHasItems = vi.spyOn(list, 'updateHasItems');
		list.merge(dayRows(0, 50).map((row) => ({ ...row, name: `${row.name}!` })), true, true);

		expect(removeRows).toHaveBeenCalledTimes(1);
		expect(updateHasItems).toHaveBeenCalledTimes(1);
		expect(list.getRows().length).toBe(50);
		expect(list.getRows()[0].name).toBe('Row 0!');
	});

	it('mingle with a divider appends the added rows as one batch', () =>
	{
		const list = build(List, { divider: createDivider() });
		list.append(dayRows(0, 5));

		const appendRows = vi.spyOn(list, 'appendRows');
		list.mingle([...dayRows(0, 5), ...dayRows(10, 20)]);

		expect(appendRows).toHaveBeenCalledTimes(1);
		expect(list.getRows().length).toBe(25);
	});

	it('merge prepend with a divider commits the item array once', () =>
	{
		const list = build(List, { divider: createDivider() });
		list.append(dayRows(20, 5));

		const prependRows = vi.spyOn(list, 'prependRows');
		const indexItems = vi.spyOn(list, 'indexItems');
		list.merge([...dayRows(0, 10), { id: 21, name: 'changed', day: 'd7' }, ...dayRows(10, 5)], false);

		// Rows are placed one by one without a per-row prepend() pass.
		expect(prependRows).not.toHaveBeenCalled();
		// The update of row 21 resolves its index without re-indexing after each prepended row.
		expect(indexItems.mock.calls.length).toBeLessThanOrEqual(1);
		expect(list.getRows().map((row) => row.id)).toEqual([14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 20, 21, 22, 23, 24]);
	});
});

describe('clone prop', () =>
{
	it('deep-copies batches by default', () =>
	{
		const list = build(List, {});
		const rows = makeRows(1, 2);
		list.append(rows);
		rows[0].name = 'mutated';

		expect(list.getRows()[0]).not.toBe(rows[0]);
		expect(list.getRows()[0].name).toBe('Row 1');
	});

	it('uses the item objects as given with clone: false', () =>
	{
		const initial = makeRows(1, 2);
		const list = build(List, { clone: false, items: initial });
		expect(list.getRows()[0]).toBe(initial[0]);

		const appended = makeRows(3, 2);
		list.append(appended);
		const prepended = makeRows(10, 2);
		list.prepend(prepended);
		const mingled = [{ id: 20, name: 'Row 20' }];
		list.mingle(mingled);
		const merged = [{ id: 30, name: 'Row 30' }];
		list.merge(merged, false);

		const rows = list.getRows();
		expect(rows.find((row) => row.id === 3)).toBe(appended[0]);
		expect(rows.find((row) => row.id === 10)).toBe(prepended[0]);
		expect(rows.find((row) => row.id === 20)).toBe(mingled[0]);
		expect(rows.find((row) => row.id === 30)).toBe(merged[0]);

		// The caller's arrays are never reordered or spliced.
		expect(prepended.map((row) => row.id)).toEqual([10, 11]);
		list.delete(1);
		expect(initial.map((row) => row.id)).toEqual([1, 2]);
	});

	it('passes through ScrollableList, DataList, DynamicList and table bodies', async () =>
	{
		const lists = [
			['scrollable', ScrollableList],
			['data', DataList],
			['dynamic', DynamicList]
		];

		for (const [cache, Atom] of lists)
		{
			const { data, requests } = createXhrData();
			const { page } = renderPage([
				// @ts-ignore
				Atom({ cache, key: 'id', data, rowItem, limit: 3, clone: false })
			]);

			const rows = makeRows(1, 3);
			requests[requests.length - 1].respond(rows);
			await flush();

			// @ts-ignore
			expect(page[cache].getRows()[0]).toBe(rows[0]);
		}

		const { page } = renderPage([
			Table({}, [
				new TableBody({ cache: 'body', key: 'id', clone: false, rowItem: (row) => Tr([Td(String(row.id))]) })
			])
		]);
		const rows = makeRows(1, 2);
		// @ts-ignore
		page.body.append(rows);
		// @ts-ignore
		expect(page.body.getRows()[1]).toBe(rows[1]);
	});
});

describe('contentVisibility prop', () =>
{
	it('styles every row with content-visibility and the estimated height', () =>
	{
		const list = build(List, { contentVisibility: true, rowHeight: 40 });
		list.append(makeRows(1, 2));

		const style = list.listContainer.firstChild.style;
		expect(style.getPropertyValue('content-visibility')).toBe('auto');
		expect(style.getPropertyValue('contain-intrinsic-size')).toBe('auto 40px');
	});

	it('defaults the row height to 64px and keeps an existing row style', () =>
	{
		const list = build(List, {
			contentVisibility: true,
			rowItem: (row) => Div({ class: 'row', style: 'color: red;', text: String(row.id) })
		});
		list.append(makeRows(1, 1));

		const style = list.listContainer.firstChild.style;
		expect(style.getPropertyValue('color')).toBe('red');
		expect(style.getPropertyValue('contain-intrinsic-size')).toBe('auto 64px');
	});

	it('is off by default', () =>
	{
		const list = build(List, {});
		list.append(makeRows(1, 1));
		expect(list.listContainer.firstChild.getAttribute('style')).toBeNull();
	});

	it('passes through ScrollableList', async () =>
	{
		const { data, requests } = createXhrData();
		const { container } = renderPage([
			ScrollableList({ cache: 'list', key: 'id', data, rowItem, limit: 3, contentVisibility: true, rowHeight: 32 })
		]);
		requests[0].respond(makeRows(1, 3));
		await flush();

		const row = container.querySelector('[data-row-key="1"]');
		// @ts-ignore
		expect(row.style.getPropertyValue('contain-intrinsic-size')).toBe('auto 32px');
	});
});

describe('List maxRows', () =>
{
	it('drops the top rows after an append and the bottom rows after a prepend', () =>
	{
		const list = build(List, { maxRows: 5 });
		list.append(makeRows(1, 8));
		expect(list.getRows().map((row) => row.id)).toEqual([4, 5, 6, 7, 8]);
		expect(list.listContainer.children.length).toBe(5);

		list.prepend(makeRows(20, 2));
		expect(list.getRows().map((row) => row.id)).toEqual([21, 20, 4, 5, 6]);
		expect(Array.from(list.listContainer.children).map((el) => el.getAttribute('data-row-key'))).toEqual(['21', '20', '4', '5', '6']);
		expect(list.findIndexByKey(8)).toBe(-1);
	});

	it('is unlimited by default and passes through DynamicList', async () =>
	{
		const list = build(List, {});
		list.append(makeRows(1, 30));
		expect(list.getRows().length).toBe(30);

		const { data, requests } = createXhrData();
		const { page } = renderPage([
			DynamicList({ cache: 'dynamic', key: 'id', data, rowItem, limit: 3, maxRows: 4 })
		]);
		requests[0].respond(makeRows(1, 3));
		await flush();

		// @ts-ignore
		page.dynamic.append(makeRows(4, 3));
		// @ts-ignore
		expect(page.dynamic.getRows().map((row) => row.id)).toEqual([3, 4, 5, 6]);
	});
});

/**
 * Creates a scroll container whose heights follow the rendered rows
 * (10px per row) with a 30px viewport, since jsdom has no layout.
 *
 * @returns {HTMLElement}
 */
const createScrollContainer = () =>
{
	const element = document.createElement('div');
	document.body.appendChild(element);

	let scrollTop = 0;
	Object.defineProperty(element, 'clientHeight', { get: () => 30 });
	Object.defineProperty(element, 'scrollHeight', { get: () => element.querySelectorAll('.row').length * 10 });
	Object.defineProperty(element, 'scrollTop', {
		get: () => scrollTop,
		set: (value) => { scrollTop = Math.max(0, value); }
	});
	return element;
};

/**
 * Renders a layout inside the scroll container.
 *
 * @param {HTMLElement} scroller
 * @param {Array<object>} children
 * @returns {object}
 */
const renderInto = (scroller, children) =>
{
	const result = renderPage(children);
	scroller.appendChild(result.container);
	return result;
};

/**
 * @param {HTMLElement} element
 * @param {number} top
 * @returns {Promise<void>}
 */
const scrollTo = async (element, top) =>
{
	element.scrollTop = top;
	element.dispatchEvent(new Event('scroll'));
	await flush();
};

/**
 * @param {HTMLElement} element
 * @returns {Array<number>}
 */
const shownIds = (element) => Array.from(element.querySelectorAll('.row')).map((el) => Number(el.textContent.split(':')[0]));

describe('ScrollableList maxRows windowing', () =>
{
	it("'down' drops the top pages, keeps the scroll position and re-fetches them on the way back", async () =>
	{
		const scroller = createScrollContainer();
		const { data, requests } = createXhrData();
		const { page } = renderInto(scroller, [
			ScrollableList({ cache: 'list', key: 'id', data, rowItem, limit: 3, maxRows: 6, loadMoreThreshold: 5, scrollContainer: scroller })
		]);

		requests[0].respond(makeRows(1, 3));
		await flush();

		await scrollTo(scroller, 0);
		expect(requests.length).toBe(2);
		requests[1].respond(makeRows(4, 3));
		await flush();
		expect(shownIds(scroller)).toEqual([1, 2, 3, 4, 5, 6]);

		await scrollTo(scroller, 35);
		expect(requests.length).toBe(3);
		expect(requests[2].offset).toBe(6);
		requests[2].respond(makeRows(7, 3));
		await flush();

		// The first page is gone and the viewport moved up by its height.
		expect(shownIds(scroller)).toEqual([4, 5, 6, 7, 8, 9]);
		expect(scroller.scrollTop).toBe(5);

		// fetchNew would leave a gap above the kept rows, so it waits.
		// @ts-ignore
		page.list.fetchNew();
		expect(requests.length).toBe(3);

		// Back at the top: the dropped page is requested again.
		await scrollTo(scroller, 0);
		expect(requests.length).toBe(4);
		expect(requests[3].offset).toBe(0);
		expect(requests[3].limit).toBe(3);
		requests[3].respond(makeRows(1, 3));
		await flush();

		// It goes back on top, the bottom page is dropped instead and the
		// viewport stays on the same rows.
		expect(shownIds(scroller)).toEqual([1, 2, 3, 4, 5, 6]);
		expect(scroller.scrollTop).toBe(30);

		// Scrolling down again re-fetches the dropped bottom page.
		await scrollTo(scroller, 30);
		expect(requests.length).toBe(5);
		expect(requests[4].offset).toBe(6);
		requests[4].respond(makeRows(7, 3));
		await flush();
		expect(shownIds(scroller)).toEqual([4, 5, 6, 7, 8, 9]);
	});

	it("'up' drops the newest pages at the bottom and brings them back when scrolling down", async () =>
	{
		const scroller = createScrollContainer();
		const { data, requests } = createXhrData();
		renderInto(scroller, [
			BiDirectionalContainer({ data, limit: 3, maxRows: 6, loadMoreThreshold: 5, scrollDirection: 'up', scrollContainer: scroller }, [
				new List({ cache: 'list', key: 'id', rowItem, isDynamic: true, linkParent: false })
			])
		]);

		// Server order is newest first; 'up' lists show oldest first.
		requests[0].respond(makeRows(7, 3).reverse());
		// Past the post-prepend cooldown.
		await wait(400);
		expect(shownIds(scroller)).toEqual([7, 8, 9]);

		await scrollTo(scroller, 0);
		expect(requests.length).toBe(2);
		requests[1].respond(makeRows(4, 3).reverse());
		await wait(400);

		await scrollTo(scroller, 0);
		expect(requests.length).toBe(3);
		expect(requests[2].offset).toBe(6);
		requests[2].respond(makeRows(1, 3).reverse());
		await wait(400);

		// The newest page was dropped once the older page settled.
		expect(shownIds(scroller)).toEqual([1, 2, 3, 4, 5, 6]);

		// Near the bottom: the newest page is requested again.
		await scrollTo(scroller, 30);
		expect(requests.length).toBe(4);
		expect(requests[3].offset).toBe(0);
		requests[3].respond(makeRows(7, 3).reverse());
		await flush();

		// The oldest page is dropped at the top and the viewport moves up by its height.
		expect(shownIds(scroller)).toEqual([4, 5, 6, 7, 8, 9]);
		expect(scroller.scrollTop).toBe(0);

		// Scrolling up loads the dropped oldest page again.
		await wait(400);
		await scrollTo(scroller, 0);
		expect(requests.length).toBe(5);
		expect(requests[4].offset).toBe(6);
	});

	it('forgets the dropped pages on refresh', async () =>
	{
		const scroller = createScrollContainer();
		const { data, requests } = createXhrData();
		const { page } = renderInto(scroller, [
			ScrollableList({ cache: 'list', key: 'id', data, rowItem, limit: 3, maxRows: 3, loadMoreThreshold: 5, scrollContainer: scroller })
		]);

		requests[0].respond(makeRows(1, 3));
		await flush();
		await scrollTo(scroller, 0);
		requests[1].respond(makeRows(4, 3));
		await flush();
		expect(shownIds(scroller)).toEqual([4, 5, 6]);

		// @ts-ignore
		page.list.refresh();
		requests[2].respond(makeRows(1, 3));
		await flush();

		// Nothing is waiting at the top any more: a scroll loads page two.
		await scrollTo(scroller, 0);
		expect(requests[3].offset).toBe(3);
	});
});
