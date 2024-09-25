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
     * @param {number} index
     * @returns {object|null}
     */
    row(item, index)
    {
        // @ts-ignore
        if (typeof this.rowItem !== 'function')
        {
            return null;
        }

        if (typeof item === 'object')
        {
            item.index = index;
        }

        // @ts-ignore
        return this.rowItem(item);
    },

    /**
     * This will delete an item from the list.
     *
     * @public
     * @param {number} index
     * @returns {void}
     */
    delete(index)
    {
        // @ts-ignore
        this.data.delete(`items[${index}]`);
    },

    /**
     * This will replace an item in the list.
     *
     * @protected
     * @param {number} index
     * @param {*} item
     * @returns {void}
     */
    replace(index, item)
    {
        // @ts-ignore
        this.data.set(`items[${index}]`, item);

        // @ts-ignore
        const ele = ChildHelper.get(this.panel, index);

        // @ts-ignore
        const row = this.row(item, index);
        ChildHelper.rebuild(row, ele, this);
    },

    /**
     * This will delete removed items from the list.
     *
     * @protected
     * @param {array} items
     * @returns {void}
     */
    deleteRemoved(items)
    {
        /**
         * This will get the deleted rows.
         */
        const deleteRows = [];
        items.forEach((item) =>
        {
            const { index } = item;
            // @ts-ignore
            const row = ChildHelper.get(this.panel, index);
            deleteRows.push({
                index,
                item,
                row
            });
        });

        // @ts-ignore
        const dataRows = this.data.items;
        dataRows.forEach((item, index) =>
        {
            deleteRows.find((deletedRow) =>
            {
                // @ts-ignore
                if (deletedRow.item[this.key] === item[this.key])
                {
                    // @ts-ignore
                    this.data.delete(`items[${index}]`);
                    ChildHelper.remove(deletedRow.row);
                }
            });
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

        const rows = [];
        // @ts-ignore
        let lastIndex = this.data.items.length - 1;
        items.forEach((item) =>
        {
            lastIndex++;

            /**
             * This will build the new rows that will be appended.
             */
            // @ts-ignore
            rows.push(this.row(item, lastIndex));

            /**
             * This will silently add the new rows without re-rendering the entire list.
             */
            // @ts-ignore
            this.data.set(`items[${lastIndex}]`, item);
        });

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
         * We need to update the deleted rows before adding or updating
         * the new rows. This is because the indexes will change when
         * we add or update the new rows.
         */
        // @ts-ignore
        this.deleteRemoved(changes.deletedItems);

        /**
         * This will add or update the new rows.
         */
        changes.changes.forEach((change) =>
        {
            const { index, item, status } = change;
            if (status === 'added')
            {
                // @ts-ignore
                this.append(item, index);
            }
            else if (status === 'updated')
            {
                // @ts-ignore
                this.replace(index, item);
            }
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

        const rows = [];
        // @ts-ignore
        let lastIndex = this.data.items.length - 1;
        items.forEach((item) =>
        {
            lastIndex++;

            /**
             * This will build the new rows that will be appended.
             */
            // @ts-ignore
            rows.push(this.row(item, lastIndex));

            /**
             * This will silently add the new rows without re-rendering the entire list.
             */
            // @ts-ignore
            this.data.set(`items[${lastIndex}]`, item);
        });

        // @ts-ignore
        ChildHelper.prepend(rows, this.panel, this);
    }
});