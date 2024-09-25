import { Div } from '@base-framework/atoms';
import { Data, Jot } from '@base-framework/base';
import { ChildHelper } from 'src/utils/child-helper.js';
import { DataHelper } from 'src/utils/data-helper.js';

/**
 * List
 *
 * This will create a list component.
 *
 * @class
 */
export const List = Jot(
{
    /**
     * This will set the default data.
     *
     * @returns {object}
     */
	setData()
    {
        return new Data({ items: [] })
    },

    /**
     * This will render the list.
     *
     * @returns {object}
     */
	render()
    {
        // @ts-ignore
        const rowCallBack = this.row.bind(this);

        return Div({
            // @ts-ignore
            class: `list ${this.class || ''}`,
            for: ['items', rowCallBack]
        });
    },

    /**
     * This will create a row for each item.
     *
     * @param {*} item
     * @returns {object|null}
     */
    row(item)
    {
        // @ts-ignore
        if (typeof this.rowItem !== 'function')
        {
            return null;
        }

        // @ts-ignore
        return this.rowItem(item);
    },

    /**
     * This will delete an item from the list.
     *
     * @public
     * @param {*} keyValue
     * @returns {void}
     */
    delete(keyValue)
    {
        // @ts-ignore
        const index = this.findIndexByKey(keyValue);
        if (index === -1)
        {
            return;
        }

        // @ts-ignore
        this.data.delete(`items[${index}]`);
        // @ts-ignore
        const rowElement = ChildHelper.get(this.panel, index);
        ChildHelper.remove(rowElement);
    },

    /**
     * This will replace an item in the list.
     *
     * @protected
     * @param {object} item
     * @returns {void}
     */
    replace(item, status)
    {
        // @ts-ignore
        if (status === 'added')
        {
            // @ts-ignore
            this.append(item);
            return;
        }

        // @ts-ignore
        this.data.set(`items[${index}]`, item);
        // @ts-ignore
        const oldRow = ChildHelper.get(this.panel, index);
        // @ts-ignore
        const newRow = this.row(item, index);
        ChildHelper.replace(oldRow, newRow);
    },

    /**
     * This will remove items from the list.
     *
     * @public
     * @param {array} items
     * @returns {void}
     */
    remove(items)
    {
        /**
         * This will get the deleted rows.
         */
        items.forEach((item) =>
        {
            // @ts-ignore
            this.delete(item[this.key]);
        });
    },

    /**
     * This will append items to the list.
     *
     * @public
     * @param {array|object} items
     * @returns {void}
     */
    append(items)
    {
        if (!Array.isArray(items))
        {
            items = [items];
        }

        /**
         * This will get all the new rows to be batched later.
         */
        const rows = [];
        // @ts-ignore
        let lastIndex = this.data.items.length - 1;
        items.forEach((item) =>
        {
            /**
             * This will build the new rows that will be appended.
             */
            // @ts-ignore
            rows.push(this.row(item));

            /**
             * This will silently add the new rows without re-rendering the entire list.
             */
            // @ts-ignore
            this.data.set(`items[${++lastIndex}]`, item);
        });

        // This will batch push all the rows.
        // @ts-ignore
        ChildHelper.append(rows, this.panel, this);
    },

    /**
     * This will mingle the new items with the old items.
     *
     * @public
     * @param {Array<Object>} newItems
     * @returns {void}
     */
    mingle(newItems)
    {
        // @ts-ignore
        const oldItems = this.data.items;

        /**
         * This will diff the old and new items to determine what has
         * been added, updated, or deleted.
         */
        // @ts-ignore
        const changes = DataHelper.diff(oldItems, newItems, this.key);

        /**
         * This will add or update the new rows.
         */
        changes.changes.forEach((change) =>
        {
            const { item, status } = change;
            // @ts-ignore
            this.replace(item, status);
        });
    },

    /**
     * This will prepend items to the list.
     *
     * @public
     * @param {array|object} items
     * @returns {void}
     */
    prepend(items)
    {
        if (!Array.isArray(items))
        {
            items = [items];
        }

        /**
         * This will get all the new rows to be batched later.
         */
        const rows = [];
        // @ts-ignore
        const rowItems = this.data.items;
        let lastIndex = rowItems.length - 1;
        items.forEach((item) =>
        {
            lastIndex++;

            /**
             * This will build the new rows that will be appended.
             */
            // @ts-ignore
            rows.push(this.row(item));

            /**
             * This will silently add the new rows without re-rendering the entire list.
             */
            rowItems.unshift(item);
        });

        // @ts-ignore
        ChildHelper.prepend(rows, this.panel, this);
    },

    /**
     * Finds the index of an item in the data array by its key.
     *
     * @private
     * @param {*} keyValue
     * @returns {number} Index of the item, or -1 if not found
     */
    findIndexByKey(keyValue)
    {
        //@ts-ignore
        const items = this.data.items;
        //@ts-ignore
        return items.findIndex((item) => item[this.key] === keyValue);
    }
});