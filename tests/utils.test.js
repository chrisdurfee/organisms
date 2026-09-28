import { describe, expect, it } from 'vitest';
import { PaginationTracker } from '../src/lists/pagination-tracker.js';
import { getNewestId, setupFetchCallback } from '../src/lists/scroll-utils.js';
import { DataHelper } from '../src/utils/data-helper.js';

describe('DataHelper.deepEqual', () =>
{
	it('compares Dates by time', () =>
	{
		expect(DataHelper.deepEqual(new Date(1000), new Date(1000))).toBe(true);
		expect(DataHelper.deepEqual(new Date(1000), new Date(2000))).toBe(false);
		expect(DataHelper.deepEqual({ at: new Date(1) }, { at: new Date(2) })).toBe(false);
		expect(DataHelper.deepEqual(new Date(1000), {})).toBe(false);
	});

	it('compares Maps by entries', () =>
	{
		expect(DataHelper.deepEqual(new Map([['a', { x: 1 }]]), new Map([['a', { x: 1 }]]))).toBe(true);
		expect(DataHelper.deepEqual(new Map([['a', 1]]), new Map([['a', 2]]))).toBe(false);
		expect(DataHelper.deepEqual(new Map([['a', 1]]), new Map([['b', 1]]))).toBe(false);
		expect(DataHelper.deepEqual(new Map(), {})).toBe(false);
	});

	it('compares Sets by members', () =>
	{
		expect(DataHelper.deepEqual(new Set([1, 2]), new Set([2, 1]))).toBe(true);
		expect(DataHelper.deepEqual(new Set([1, 2]), new Set([1, 3]))).toBe(false);
		expect(DataHelper.deepEqual(new Set([{ a: 1 }]), new Set([{ a: 1 }]))).toBe(true);
		expect(DataHelper.deepEqual(new Set([{ a: 1 }]), new Set([{ a: 2 }]))).toBe(false);
	});

	it('handles null-prototype objects', () =>
	{
		const a = Object.assign(Object.create(null), { x: 1 });
		const b = Object.assign(Object.create(null), { x: 1 });
		const c = Object.assign(Object.create(null), { y: 1 });
		expect(DataHelper.deepEqual(a, b)).toBe(true);
		expect(DataHelper.deepEqual(a, c)).toBe(false);
	});

	it('does not treat an array and an object with the same keys as equal', () =>
	{
		expect(DataHelper.deepEqual(['a'], { 0: 'a' })).toBe(false);
	});

	it('reports a row whose date changed as updated', () =>
	{
		const oldRows = [{ id: 1, at: new Date(1) }];
		const newRows = [{ id: 1, at: new Date(2) }];
		expect(DataHelper.diff(oldRows, newRows, 'id').changes[0].status).toBe('updated');
	});
});

describe('getNewestId', () =>
{
	it('compares numeric string ids numerically', () =>
	{
		expect(getNewestId([{ id: '9' }, { id: '10' }])).toBe('10');
		expect(getNewestId([{ id: '10' }, { id: '9' }])).toBe('10');
	});

	it('uses the given key', () =>
	{
		expect(getNewestId([{ uid: 3 }, { uid: 7 }], 'uid')).toBe(7);
	});

	it('falls back to id when the key is empty', () =>
	{
		expect(getNewestId([{ id: 3 }, { id: 7 }], null)).toBe(7);
	});

	it('compares non-numeric ids as strings', () =>
	{
		expect(getNewestId([{ id: 'b' }, { id: 'a' }])).toBe('b');
	});
});

describe('PaginationTracker', () =>
{
	it('resets to the initial offset', () =>
	{
		const tracker = new PaginationTracker(30, 10);
		tracker.update(10, 'c');
		expect(tracker.currentOffset).toBe(40);
		tracker.reset();
		expect(tracker.currentOffset).toBe(30);
		expect(tracker.lastCursor).toBeNull();
	});

	it('supersedes in-flight requests on reset and cancel', () =>
	{
		const tracker = new PaginationTracker();
		const token = tracker.generation;
		expect(tracker.isCurrent(token)).toBe(true);
		tracker.reset();
		expect(tracker.isCurrent(token)).toBe(false);

		const next = tracker.generation;
		tracker.loading = true;
		tracker.cancel();
		expect(tracker.isCurrent(next)).toBe(false);
		expect(tracker.loading).toBe(false);
	});
});

describe('setupFetchCallback', () =>
{
	it('flags a failed response instead of reporting an empty page', () =>
	{
		const data = { xhr: { all: (params, callBack) => callBack(false) } };
		const calls = [];
		setupFetchCallback(data)(new PaginationTracker(), (...args) => calls.push(args));
		expect(calls).toEqual([[[], null, true]]);
	});

	it('passes rows and cursor for a successful response', () =>
	{
		const data = { xhr: { all: (params, callBack) => callBack({ rows: [{ id: 1 }], lastCursor: 'x' }) } };
		const calls = [];
		setupFetchCallback(data)(new PaginationTracker(), (...args) => calls.push(args));
		expect(calls).toEqual([[[{ id: 1 }], 'x', false]]);
	});
});
