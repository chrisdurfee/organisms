import { Tbody } from '@base-framework/atoms';
import { List } from '../lists/list.js';

/**
 * TableBody
 *
 * This will create a table body component.
 *
 * @param {object} props
 * @property {string} class - The class to add to the list
 * @property {string} key - The key to use to identify the items
 * @property {array} [items] - The items
 *
 * @class
 */
// @ts-ignore
export class TableBody extends List
{
    render()
    {
        // @ts-ignore
        const rowCallBack = this.row.bind(this);

        return Tbody({
            // @ts-ignore
            class: `tbody ${this.class || ''}`,
            for: ['items', rowCallBack]
        });
    }
};