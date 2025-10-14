/**
 * PaginationTracker stores and updates pagination state.
 * Supports bi-directional cursor pagination for both backward (older)
 * and forward (newer) data fetching.
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
		// Backward pagination (older/historical data)
		this.lastCursor = null;
		this.currentOffset = offset;
		this.limit = limit;
		this.hasMoreData = true;
		this.loading = false;

		// Forward pagination (newer data)
		this.newestId = null;
		this.hasNewerData = false;
		this.loadingNewer = false;
	}

	/**
	 * Returns whether more data can be loaded (backward/older).
	 *
	 * @returns {boolean}
	 */
	canLoadMore()
	{
		return this.hasMoreData;
	}

	/**
	 * Returns whether newer data can be loaded (forward).
	 *
	 * @returns {boolean}
	 */
	canLoadNewer()
	{
		return this.hasNewerData && this.newestId !== null;
	}

	/**
	 * Updates the tracker state based on the number of items loaded (backward).
	 *
	 * @param {number} numItems - The number of items loaded.
	 * @param {string|null} lastCursor - The last cursor value.
	 * @returns {void}
	 */
	update(numItems, lastCursor = null)
	{
		if (numItems < this.limit)
		{
			this.hasMoreData = false;
		}

		this.lastCursor = lastCursor;
		this.currentOffset += numItems;
	}

	/**
	 * Updates the newest ID for forward pagination.
	 *
	 * @param {string|number|null} newestId - The ID of the newest item.
	 * @returns {void}
	 */
	updateNewest(newestId)
	{
		this.newestId = newestId;
		this.hasNewerData = newestId !== null;
	}

	/**
	 * Resets the tracker state.
	 *
	 * @returns {void}
	 */
	reset()
	{
		this.lastCursor = null;
		this.currentOffset = 0;
		this.hasMoreData = true;
		this.loading = false;
		this.newestId = null;
		this.hasNewerData = false;
		this.loadingNewer = false;
	}
}

export default PaginationTracker;