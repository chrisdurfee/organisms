
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
			this.lastPrepend = this.getValue(firstItem);
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
		const value = this.getValue(item);
		const first = this.setFirstValues(value);

		// Only add divider for first item if skipFirst is false
		if (first && !this.skipFirst)
		{
			this.addDivider(value, children);
		}

		if (this.compare(this.lastAppend, value))
		{
			this.addDivider(value, children);
			this.lastAppend = value;
		}
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
	 * @returns {void}
	 */
	addDivider(value, children)
	{
		if (!this.layout || !children)
		{
			return;
		}

		// Avoid adding duplicate dividers for the same value
		if (this.lastDividerValue !== null && this.compare(this.lastDividerValue, value) === false)
		{
			// same value as last divider -> skip
			return;
		}

		const layout = this.layout(value);
		children.push(layout);

		// remember the last divider value we added
		this.lastDividerValue = value;
	}
}