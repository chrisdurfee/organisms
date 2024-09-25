import { Builder, Html } from "@base-framework/base";

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

    /**
     * This will get the index of the node.
     *
     * @param {object} node
     * @returns {number}
     */
    static index(node)
    {
        return node?.parentNode?.children.indexOf(node) ?? -1;
    }

    /**
     * This will get the previous index of the node.
     *
     * @param {object} node
     * @returns {number}
     */
    static getPreviousIndex(node)
    {
        let index = this.index(node);
        return (index > 0)? index - 1 : 0;
    }

    /**
     * This will replace a child layout.
     *
     * @param {object} layout
     * @param {object} oldChild
     * @param {object} parent
     * @returns {void}
     */
    static replace(layout, oldChild, parent)
    {
        if (!oldChild)
        {
            return;
        }

        // get child index from parent
        const container = oldChild.parentNode;
        const index = this.getPreviousIndex(oldChild);
        this.remove(oldChild);

        const frag = Builder.build(layout, null, parent);

        // append to parent at index
        container.insertBefore(frag, container.childNodes[index]);
    }

    /**
     * This will remove a child.
     *
     * @param {object} node
     * @returns {void}
     */
    static remove(node)
    {
        if (node)
        {
            Html.removeChild(node);
        }
    }

    /**
     * This will append a child layout.
     *
     * @param {object} childrenLayout
     * @param {object} container
     * @param {object} parent
     * @returns {void}
     */
    static append(childrenLayout, container, parent)
    {
        if (!childrenLayout)
        {
            return;
        }

        Builder.build(childrenLayout, container, parent);
    }

    /**
     * This will prepend a child layout.
     *
     * @param {object} childrenLayout
     * @param {object} container
     * @param {object} parent
     * @returns {void}
     */
    static prepend(childrenLayout, container, parent)
    {
        if (!childrenLayout)
        {
            return;
        }

        const frag = Builder.build(childrenLayout, null, parent);
        parent.insertBefore(frag, container.firstChild);
    }
}