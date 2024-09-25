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
		newArray.forEach((newItem, newIndex) =>
		{
			const keyValue = newItem[key];
			if (!oldItemsMap.has(keyValue))
			{
				// Item is added
				changes.push(Item(newIndex, newItem, 'added'));
				return;
			}

			const { item: oldItem } = oldItemsMap.get(keyValue);
			if (!this.deepEqual(oldItem, newItem))
			{
				// Item is updated
				changes.push(Item(newIndex, newItem, 'updated'));
				return;
			}

			// Item is unchanged
			changes.push(Item(newIndex, newItem, 'unchanged'));

			// Remove from oldItemsMap to identify deletions later
			oldItemsMap.delete(keyValue);
		});

		// Remaining items in oldItemsMap are deleted
		oldItemsMap.forEach(({ item: oldItem, index: oldIndex }) =>
		{
			deletedItems.push({
				index: oldIndex,
				item: oldItem,
				status: 'deleted'
			});
		});

		return {
			changes,
			deletedItems
		};
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
		array.forEach((item, index) =>
		{
			map.set(item[key], { item, index });
		});
		return map;
	}

	/**
	 * Performs a deep comparison between two objects.
	 *
	 * @param {Object} obj1 - The first object to compare.
	 * @param {Object} obj2 - The second object to compare.
	 * @returns {boolean} True if objects are equal, else false.
	 * @private
	 */
	static deepEqual(obj1, obj2)
	{
		if (obj1 === obj2) return true;

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

		// Different number of properties
		if (keys1.length !== keys2.length)
		{
			return false
		}

		for (const key of keys1)
		{
			if (!keys2.includes(key))
			{
				return false;
			}

			if (!this.deepEqual(obj1[key], obj2[key]))
			{
				return false
			}
		}

		return true;
	}
}