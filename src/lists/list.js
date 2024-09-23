import { Div } from '@base-framework/atoms';
import { Data, Jot } from '@base-framework/base';

export const List = Jot(
{
    /**
     * This will set the default data.
     *
     * @returns {object}
     */
	setData()
    {
        // @ts-ignore
        return new Data({ [this.prop]: [] })
    },

	render()
    {
        // @ts-ignore
        const rowCallBack = this.row.bind(this);

        return Div({
            class: 'list',
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
     * @param {number} index
     * @returns {void}
     */
    delete(index)
    {
        // @ts-ignore
        this.data.delete(`${this.prop}[${index}]`);
    },

    replace(index, item)
    {
        // @ts-ignore
        this.data.set(`${this.prop}[${index}]`, item);
    },

    append(items)
    {
        if (!Array.isArray(items))
        {
            items = [items];
        }

        const rows = [];
        // @ts-ignore
        let lastIndex = this.data[this.prop].length - 1;
        items.forEach((item) =>
        {
            lastIndex++;
            // @ts-ignore
            rows.push(this.row(item, lastIndex));
            // @ts-ignore
            this.data.set(`${this.prop}[${lastIndex}]`, item);
        });
    },

    prepend(items)
    {

    }
});