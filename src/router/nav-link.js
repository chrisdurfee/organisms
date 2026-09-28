import { Component, router } from '@base-framework/base';

/**
 * Watcher
 *
 * This will create a watcher object.
 *
 * @param {string} attr
 * @param {string} value
 * @returns {object}
 */
const Watcher = (attr, value) => ({
	attr,
	value
});

/**
 * This will escape regex special characters in a path so paths
 * containing metacharacters (e.g. "(", "?", "+") cannot throw or
 * mismatch when building the active-route pattern.
 *
 * @param {string} path
 * @returns {string}
 */
const escapeRegExp = (path) => String(path).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * This will compile the active-route pattern for a link path.
 *
 * @param {string} path
 * @returns {RegExp}
 */
const compileActivePattern = (path) => new RegExp('^' + escapeRegExp(path) + '($|#|/|\\.).*');

/**
 * NavLink
 *
 * This will create a nav link that will add an active
 * class when the browser route path matches the link
 * href.
 *
 * @property {string} activeClass - The active class to add.
 * @property {string} class - The class
 * @property {string} exact - The exact match
 * @property {string|object} href - The href or watcher object
 * @property {string|object} text - The text or watcher object
 * @property {array|string} nest - The nested elements
 *
 * @class
 * @extends Component
 */
export class NavLink extends Component
{
    /**
     * This will configure the link active class.
     *
     * @protected
     * @returns {void}
     */
    beforeSetup()
    {
        // @ts-ignore
        this.selectedClass = this.activeClass || 'active';
    }

    /**
     * This will render the component.
     *
     * @returns {object}
     */
    render()
    {
        // @ts-ignore
        const href = this.href,
        // @ts-ignore
        text = this.text,
        watchers = this.setupWatchers(href, text);

        return {
            tag: 'a',
            // @ts-ignore
            class: this.class || this.className || null,
            onState: ['selected', {
                [this.selectedClass]: true
            }],
            href: this.getString(href),
            text: this.getString(text),
            // @ts-ignore
            nest: this.nest || this.children,
            // @ts-ignore
            dataSet: this.dataSet,
            watch: watchers
        };
    }

    /**
     * This will get string.
     *
     * @param {string} string
     * @returns {(string|null)}
     */
    getString(string)
    {
        const type = typeof string;
        return (type !== 'object' && type !== 'undefined')? string : null;
    }

    /**
     * This will setup the watchers.
     *
     * @protected
     * @param {string} href
     * @param {string} text
     * @returns {array}
     */
    setupWatchers(href, text)
    {
        // @ts-ignore
        const exact = (this.exact === true),
        data = router.data;

        const watchers = [];

        if (href && typeof href === 'object')
        {
            watchers.push(Watcher('href', href));
        }

        if (text && typeof text === 'object')
        {
            watchers.push(Watcher('text', text));
        }

        watchers.push({
            value: ['[[path]]', data],
            callBack: (value, ele) =>
            {
                const path = ele.pathname + ele.hash;
				const selected = exact? (value === path) : this.getActivePattern(ele.pathname).test(value);
                this.update(selected);
            }
        });

        return watchers;
    }

    /**
     * This will return the active-route pattern for the link path.
     *
     * The pattern is compiled once per path and reused on every route
     * change; it is only rebuilt when the link href (and so its
     * pathname) changes.
     *
     * @param {string} pathname
     * @returns {RegExp}
     */
    getActivePattern(pathname)
    {
        // @ts-ignore
        if (!this.activePattern || this.activePatternPath !== pathname)
        {
            // @ts-ignore
            this.activePatternPath = pathname;
            // @ts-ignore
            this.activePattern = compileActivePattern(pathname);
        }

        // @ts-ignore
        return this.activePattern;
    }

    /**
     * This will setup the states.
     *
     * @protected
     * @returns {object}
     */
    setupStates()
    {
        return {
            selected: false
        };
    }

    /**
     * This will update the class on the element.
     *
     * @param {boolean} selected
     * @returns {void}
     */
    update(selected)
    {
        // @ts-ignore
        this.state.selected = selected;
    }
}