import { Div } from '@base-framework/atoms';
import { Data, Jot } from '@base-framework/base';
import { ChildHelper } from 'src/utils/child-helper.js';
import { DataHelper } from 'src/utils/data-helper.js';
import { RowDivider } from './row-divider.js';

/**
 * This will clone the data.
 *
 * @param {*} data
 * @returns {*}
 */
const clone = (data) => JSON.parse(JSON.stringify(data));

/**
 * List
 *
 * This will create a list component.
 *
 * @property {string} class - The class to add to the list
 * @property {string} key - The key to use to identify the items
 * @property {array} [items] - The items
 *
 * @class
 */
export const List = Jot(
{
    /**
     * This will check to set upt he row divider.
     *
     * @returns {void}
     */
    onCreated()
    {
        // @ts-ignore
        if (this.divider)
        {
            // @ts-ignore
            this.rowDivider = new RowDivider({ ...this.divider, parent: this });
        }
    },

    /**
     * This will set the default data.
     *
     * @returns {object}
     */
	setData()
    {
        // @ts-ignore
        const items = (this.items)? clone(this.items) : [];
        return new Data({ items })
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
    row(item, index, scope, ele)
    {
        // @ts-ignore
        if (typeof this.rowItem !== 'function')
        {
            return null;
        }

        // @ts-ignore
        if (this.rowDivider)
        {
            // @ts-ignore
            this.rowDivider.append(item);
        }

        // @ts-ignore
        return this.rowItem(item);
    },

    /**
     * This will run after the setup.
     *
     * @returns {void}
     */
    afterSetup()
    {
        // @ts-ignore
        if (this.rowDivider)
        {
            // @ts-ignore
            this.rowDivider.addContainer(this.panel);
        }
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
     * @param {object} row
     * @returns {void}
     */
    replace(row)
    {
        if (row.status === 'unchanged')
        {
            return;
        }

        // @ts-ignore
        const item = row.item;
        if (row.status === 'added')
        {
            // @ts-ignore
            this.append(item);
            return;
        }

        // @ts-ignore
        const keyValue = item[this.key];
        // @ts-ignore
        const index = this.findIndexByKey(keyValue);
        if (index === -1)
        {
            return;
        }

        // @ts-ignore
        this.data.set(`items[${index}]`, item);
        // @ts-ignore
        const oldRow = ChildHelper.get(this.panel, index);
        // @ts-ignore
        const layout = this.row(item, index);
        ChildHelper.replace(layout, oldRow, this);
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
     * This will set the items in the list.
     *
     * @public
     * @param {array} rows
     * @returns {void}
     */
    setRows(rows)
    {
        // @ts-ignore
        this.data.set('items', rows);
    },

    /**
     * This will get the items in the list.
     *
     * @public
     * @returns {array}
     */
    getRows()
    {
        // @ts-ignore
        return this.data.get('items');
    },

    /**
     * This will reset the list.
     *
     * @public
     * @returns {void}
     */
    reset()
    {
        // @ts-ignore
        this.data.set('items', []);

        // @ts-ignore
        if (this.rowDivider)
        {
            // @ts-ignore
            this.rowDivider.reset();
        }
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

        items = clone(items);

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
     * @param {boolean} withDelete
     * @returns {void}
     */
    mingle(newItems, withDelete = false)
    {
        newItems = clone(newItems);

        // @ts-ignore
        const oldItems = this.data.get('items');

        /**
         * This will diff the old and new items to determine what has
         * been added, updated, or deleted.
         */
        // @ts-ignore
        const changes = DataHelper.diff(oldItems, newItems, this.key);

        /**
         * We want to delete the items before adding and updating the
         * new items.
         */
        if (withDelete && changes.deletedItems.length > 0)
        {
            // @ts-ignore
            this.remove(changes.deletedItems);
        }

        /**
         * This will add or update the new rows.
         */
        changes.changes.forEach((row) =>
        {
            // @ts-ignore
            this.replace(row);
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

        items = clone(items);

        /**
         * This will get all the new rows to be batched later.
         */
        const rows = [];
        const reverseItems = items.reverse();
        reverseItems.forEach((item) =>
        {
            /**
             * This will build the new rows that will be appended.
             */
            // @ts-ignore
            rows.push(this.row(item));
        });

        // This will use the get method to get the items as a raw array.
        // @ts-ignore
        const newItems = reverseItems.concat(this.data.get('items'));

        /**
         * This will silently add the new rows without re-rendering the entire
         * list. This will bypass the data object and directly add the items
         * to the stage.
         */
        // @ts-ignore
        this.data.attributes.items = newItems;
        // @ts-ignore
        this.data.stage.items = newItems;

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