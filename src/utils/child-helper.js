/**
 * ChildHelper
 *
 * This class will help with getting children of a node.
 *
 * @class
 */
export class ChildHelper
{
    /**
     * This will get the first child.
     *
     * @param {object} parent
     * @returns {object|null}
     */
	static first(parent)
    {
        return this.get(parent, 0);
    }

    /**
     * This will get the last child.
     *
     * @param {object} parent
     * @returns {object|null}
     */
    static last(parent)
    {
        const index = parent.childNodes.length - 1;
        return this.get(parent, index);
    }

    /**
     * This will get the child at the specified index.
     *
     * @param {object} parent
     * @param {number} index
     * @returns {object|null}
     */
    static get(parent, index)
    {
        return parent?.childNodes[index] ?? null;
    }

    /**
     * This will get the parent of the node.
     *
     * @param {object} node
     * @returns {object|null}
     */
    static next(node)
    {
        return node?.nextSibling ?? null;
    }

    /**
     * This will get the previous sibling.
     *
     * @param {object} node
     * @returns {object|null}
     */
    static previous(node)
    {
        return node?.previousSibling ?? null;
    }
}