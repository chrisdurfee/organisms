/**
 * This will create a new item.
 *
 * @param {number} index
 * @param {*} item
 * @param {string} status
 * @returns {object}
 */
const Item = (index, item, status) =>
{
	return {
		index,
		item,
		status
	};
};

/**
 * DataHelper
 *
 * This will help with data manipulation.
 *
 * @class
 */
export class DataHelper
{
	/**
	 * Compares two arrays of objects and returns the differences based on a specified key.
	 *
	 * @param {Array<Object>} oldArray - The original array of objects.
	 * @param {Array<Object>} newArray - The updated array of objects.
	 * @param {string} key - The key used to compare objects in the arrays.
	 * @returns {Object} An object containing arrays of added, updated, and deleted items.
	 */
	static diff(oldArray, newArray, key)
	{
		const oldItemsMap = this.arrayToMap(oldArray, key);
		const changes = [];
		const deletedItems = [];

		// Process new array to determine status of each item
		const newLength = newArray.length;
		for (let i = 0; i < newLength; i++)
		{
			const newItem = newArray[i];
			const keyValue = newItem[key];
			if (!oldItemsMap.has(keyValue))
			{
				// Item is added
				changes.push(Item(i, newItem, 'added'));
				continue;
			}

			const { item: oldItem } = oldItemsMap.get(keyValue);
			if (!this.deepEqual(oldItem, newItem))
			{
				// Item is updated
				changes.push(Item(i, newItem, 'updated'));
				continue;
			}

			// Item is unchanged
			changes.push(Item(i, newItem, 'unchanged'));

			// Remove from oldItemsMap to identify deletions later
			oldItemsMap.delete(keyValue);
		}

		// Remaining items in oldItemsMap are deleted
		oldItemsMap.forEach(({ item: oldItem }) =>
		{
			deletedItems.push(oldItem);
		});

		return {
			changes,
			deletedItems
		};
	}

	/**
	 * Modifies an array of objects by updating existing items based on a specified key.
	 *
	 * @param {Array<Object>} newArray - The array containing updated items.
	 * @param {Array<Object>} oldArray - The original array of items.
	 * @param {string} key - The key used to identify items.
	 * @param {boolean} [addMissing=false] - Whether to include items that are in newArray but not in oldArray.
	 * @returns {Array<Object>} An array of items that were modified or added.
	 */
	static modify(newArray, oldArray, key, addMissing = false)
	{
		const changes = [];

		// @ts-ignore
		const oldItems = DataHelper.arrayToMap(oldArray, key);
		const length = newArray.length;
		for (let i = 0; i < length; i++)
		{
			let item = newArray[i];
			// @ts-ignore
			const id = item[key] ?? null;
			if (!oldItems.has(item[id]))
			{
				if (!addMissing)
				{
					continue;
				}

				changes.push(Item(i, item, 'added'));
				continue;
			}

			/**
			 * This will modify the existing item with new properties.
			 */
			const oldItem = oldItems.get(item[id]).item;
			item = { ...oldItem, ...item };

			changes.push(Item(i, item, 'updated'));
		}
		return changes;
	}

	/**
	 * Converts an array of objects into a Map keyed by the specified property.
	 * Each value in the Map is an object containing the item and its index in the array.
	 *
	 * @param {Array<Object>} array - The array to convert.
	 * @param {string} key - The key used to map the objects.
	 * @returns {Map} A Map with keys as specified property and values as objects.
	 * @private
	 */
	static arrayToMap(array, key)
	{
		const map = new Map();
		const length = array.length;
		for (let i = 0; i < length; i++)
		{
			const item = array[i];
			map.set(item[key], { item, index: i });
		}
		return map;
	}

	/**
	 * Performs a deep comparison between two objects.
	 * Optimized with early exits for common cases.
	 *
	 * @param {Object} obj1 - The first object to compare.
	 * @param {Object} obj2 - The second object to compare.
	 * @returns {boolean} True if objects are equal, else false.
	 * @private
	 */
	static deepEqual(obj1, obj2)
	{
		// Fast path: identical references
		if (obj1 === obj2) return true;

		// Fast path: type check and null check
		if (
			typeof obj1 !== 'object' ||
			obj1 === null ||
			typeof obj2 !== 'object' ||
			obj2 === null
		)
		{
			return false;
		}

		const keys1 = Object.keys(obj1);
		const keys2 = Object.keys(obj2);

		// Fast path: different number of properties
		if (keys1.length !== keys2.length)
		{
			return false;
		}

		// Optimized loop for property comparison
		const length = keys1.length;
		for (let i = 0; i < length; i++)
		{
			const key = keys1[i];

			// Fast path: check if key exists in obj2
			if (!obj2.hasOwnProperty(key))
			{
				return false;
			}

			// Recursive comparison
			if (!this.deepEqual(obj1[key], obj2[key]))
			{
				return false;
			}
		}

		return true;
	}
}