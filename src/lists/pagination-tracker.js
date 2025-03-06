/**
 * PaginationTracker stores and updates pagination state.
 *
 * @class
 */
export class PaginationTracker
{
	/**
	 * Creates an instance of PaginationTracker.
	 *
	 * @param {number} [offset=0] - The initial offset.
	 * @param {number} [limit=20] - The number of items to load per batch.
	 */
	constructor(offset = 0, limit = 20)
	{
		this.currentOffset = offset;
		this.limit = limit;
		this.hasMoreData = true;
		this.loading = false;
	}

	/**
	 * Returns whether more data can be loaded.
	 *
	 * @returns {boolean}
	 */
	canLoadMore()
	{
		return this.hasMoreData;
	}

	/**
	 * Updates the tracker state based on the number of items loaded.
	 *
	 * @param {number} numItems - The number of items loaded.
	 * @returns {void}
	 */
	update(numItems)
	{
		if (numItems < this.limit)
		{
			this.hasMoreData = false;
		}
		this.currentOffset += numItems;
	}

	/**
	 * Resets the tracker state.
	 *
	 * @returns {void}
	 */
	reset()
	{
		this.currentOffset = 0;
		this.hasMoreData = true;
		this.loading = false;
	}
}

export default PaginationTracker;