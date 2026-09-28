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
		/**
		 * The offset the first page starts from. reset() returns to this
		 * value so an `offset` prop is honoured after every reset, not
		 * only until the first fetch.
		 */
		this.initialOffset = Number(offset) || 0;

		// Backward pagination (older/historical data)
		this.lastCursor = null;
		this.currentOffset = this.initialOffset;
		this.limit = limit;
		this.hasMoreData = true;
		this.loading = false;

		// Forward pagination (newer data)
		this.newestId = null;
		this.hasNewerData = false;
		this.loadingNewer = false;

		/**
		 * The request generation. Every reset or cancel moves it forward,
		 * so a response to a request issued before that point can tell it
		 * was superseded and be dropped instead of landing on the reset
		 * (or destroyed) list.
		 */
		this.generation = 0;

		/**
		 * How many times the tracker has been reset. Lets state that is
		 * derived from the pagination position (the row window's page
		 * ledger) notice a reset without being told.
		 */
		this.resets = 0;
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
	 * Returns whether a request token read from `generation` is still
	 * current, i.e. no reset or cancel has happened since it was issued.
	 *
	 * @param {number} generation
	 * @returns {boolean}
	 */
	isCurrent(generation)
	{
		return generation === this.generation;
	}

	/**
	 * Supersedes every in-flight request without moving the pagination
	 * position. Used when the owner is destroyed or a refresh starts.
	 *
	 * @returns {void}
	 */
	cancel()
	{
		this.generation++;
		this.loading = false;
		this.loadingNewer = false;
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
	 * Resets the tracker state. Any request still in flight is superseded
	 * so its response cannot land on top of the reset state.
	 *
	 * @returns {void}
	 */
	reset()
	{
		this.lastCursor = null;
		this.currentOffset = this.initialOffset;
		this.hasMoreData = true;
		this.newestId = null;
		this.hasNewerData = false;
		this.resets++;
		this.cancel();
	}
}

export default PaginationTracker;