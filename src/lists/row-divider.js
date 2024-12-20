
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
     */
    constructor({ layout, itemProperty, customCompare })
    {
        this.layout = layout;
        this.itemProperty = itemProperty
        this.customCompare = customCompare;

        this.lastAppend = null;
        this.lastPrepend = null;
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
        if (first)
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
        if (first)
        {
            this.addDivider(value, children);
        }

        if (this.compare(this.lastPrepend, value))
        {
            this.addDivider(value, children);
            this.lastPrepend = value;
        }
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

        const layout = this.layout(value);
        children.push(layout);
    }
}