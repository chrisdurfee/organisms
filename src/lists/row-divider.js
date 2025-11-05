
/**
 * RowDivider
 *
 * This will check to add divider rows to a list based on a divider.
 *
 * @class
 */
export class RowDivider
{
	/**
	 * This will create a row divider.
	 *
	 * @param {object} options
	 * @param {function} options.layout
	 * @param {string} options.itemProperty
	 * @param {function} [options.customCompare]
	 * @param {boolean} [options.skipFirst=false] - Skip adding divider for the first item
	 */
	constructor({ layout, itemProperty, customCompare, skipFirst = false })
	{
		this.layout = layout;
		this.itemProperty = itemProperty
		this.customCompare = customCompare;
		this.skipFirst = skipFirst;

		this.lastAppend = null;
		this.lastPrepend = null;
		// Track the last divider value that was actually added to prevent duplicates
		this.lastDividerValue = null;
		// Track the boundary value when prepending to avoid duplicate dividers at the boundary
		this.prependBoundary = null;
	}

	/**
	 * This will reset the divider.
	 *
	 * @returns {void}
	 */
	reset()
	{
		this.lastAppend = null;
		this.lastPrepend = null;
		this.lastDividerValue = null;
		this.prependBoundary = null;
	}

	/**
	 * This will set the prepend boundary to the first item's value.
	 * This should be called before prepending a new batch of items.
	 *
	 * @param {object} firstItem
	 * @returns {void}
	 */
	setPrependBoundary(firstItem)
	{
		if (firstItem)
		{
			const value = this.getValue(firstItem);
			this.lastPrepend = value;
			// Store the boundary separately to prevent duplicate dividers
			// when prepending items that transition back to the existing date
			this.prependBoundary = value;
			// Clear lastDividerValue when starting a new prepend batch
			// This prevents stale values from previous operations causing issues
			this.lastDividerValue = null;
		}
		else
		{
			// Clear prepend boundary if no first item
			this.prependBoundary = null;
		}
	}

	/**
	 * This will set the first values.
	 *
	 * @param {*} value
	 * @returns {boolean}
	 */
	setFirstValues(value)
	{
		let last = this.lastAppend;
		if (!last)
		{
			this.lastAppend = value;
			this.lastPrepend = value;
		}
		return (!last);
	}

	/**
	 * This will append a value.
	 *
	 * @param {object} item
	 * @param {Array<object>} children
	 * @returns {void}
	 */
	append(item, children)
	{
		// Clear prepend boundary when appending (no longer prepending)
		this.prependBoundary = null;

		const value = this.getValue(item);
		const first = this.setFirstValues(value);

		// Only add divider for first item if skipFirst is false
		if (first && !this.skipFirst)
		{
			this.addDivider(value, children);
			return;
		}

		// Skip adding divider on first item when skipFirst is true
		if (first)
		{
			return;
		}

		if (this.compare(this.lastAppend, value))
		{
			this.addDivider(value, children);
		}

		// Always update lastAppend to track the current date boundary
		this.lastAppend = value;
	}

	/**
	 * This will get the value of the item.
	 *
	 * @param {object} item
	 * @returns {*}
	 */
	getValue(item)
	{
		return item[this.itemProperty] ?? null;
	}

	/**
	 * This will prepend a value.
	 *
	 * @param {object} item
	 * @param {Array<object>} children
	 * @returns {void}
	 */
	prepend(item, children)
	{
		const value = this.getValue(item);
		const first = this.setFirstValues(value);

		// Only add divider for first item if skipFirst is false
		if (first && !this.skipFirst)
		{
			this.addDivider(value, children);
			return;
		}

		// Skip adding divider on first item when skipFirst is true
		if (first)
		{
			return;
		}

		if (this.compare(this.lastPrepend, value))
		{
			this.addDivider(value, children);
		}

		// Always update lastPrepend to track the current date boundary
		this.lastPrepend = value;
	}

	/**
	 * This will compare the values.
	 *
	 * @param {*} lastValue
	 * @param {*} value
	 * @returns {boolean}
	 */
	compare(lastValue, value)
	{
		if (this.customCompare)
		{
			return this.customCompare(lastValue, value);
		}

		return (lastValue !== value);
	}

	/**
	 * This will add a divider layout.
	 *
	 * @param {*} value
	 * @param {Array<object>} children
	 * @returns {void}
	 */
	addDivider(value, children)
	{
		if (!this.layout || !children)
		{
			return;
		}

		// Avoid adding duplicate dividers for the same value as last divider
		if (this.lastDividerValue !== null && this.compare(this.lastDividerValue, value) === false)
		{
			// same value as last divider -> skip
			return;
		}

		// When prepending, avoid adding a divider that matches the boundary
		// (the boundary represents an existing divider in the DOM)
		if (this.prependBoundary !== null && this.compare(this.prependBoundary, value) === false)
		{
			// same value as prepend boundary -> skip (divider already exists)
			return;
		}

		const layout = this.layout(value);

		// Mark dividers so they can be identified and skipped when finding row elements
		if (layout && typeof layout === 'object')
		{
			layout['data-divider'] = 'true';
		}

		children.push(layout);

		// remember the last divider value we added
		this.lastDividerValue = value;
	}
}