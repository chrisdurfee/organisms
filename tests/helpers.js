import { Div } from '@base-framework/atoms';
import { Builder, Component } from '@base-framework/base';

/**
 * Waits until pending publish batches (queued as microtasks) and
 * animation frames have been delivered.
 *
 * @returns {Promise<void>}
 */
export const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

/**
 * Creates a container element attached to the document body.
 *
 * @returns {HTMLElement}
 */
export const createContainer = () =>
{
	const container = document.createElement('div');
	document.body.appendChild(container);
	return container;
};

/**
 * Removes every child of the document body.
 *
 * @returns {void}
 */
export const resetBody = () =>
{
	document.body.innerHTML = '';
};

/**
 * A page component that renders the given layout. Lists register
 * themselves on it through their `cache` name.
 */
export class Page extends Component
{
	/**
	 * @returns {object}
	 */
	render()
	{
		// @ts-ignore
		return Div({ class: 'page' }, this.children);
	}
}

/**
 * Renders a layout inside a Page into a fresh container.
 *
 * @param {Array<object>} children
 * @param {object} [props]
 * @returns {{ page: Page, container: HTMLElement }}
 */
export const renderPage = (children, props = {}) =>
{
	const container = createContainer();
	// @ts-ignore
	const page = new Page({ ...props }, children);
	Builder.render(page, container);
	return { page, container };
};

/**
 * Creates a fake data object whose `xhr[method]` records every request
 * and lets the test answer each one when it chooses.
 *
 * @param {string} [method='all']
 * @returns {{ data: object, requests: Array<object> }}
 */
export const createXhrData = (method = 'all') =>
{
	const requests = [];
	const data = {
		xhr: {
			[method]: (params, callBack, offset, limit, lastCursor, since) =>
			{
				requests.push({
					offset,
					limit,
					lastCursor,
					since,
					/**
					 * Answers the request with a successful response.
					 *
					 * @param {Array<object>} rows
					 * @param {*} [cursor]
					 * @returns {void}
					 */
					respond: (rows, cursor = null) => callBack({ rows, lastCursor: cursor }),

					/**
					 * Answers the request the way the base XHR reports an
					 * error (the response is false).
					 *
					 * @returns {void}
					 */
					fail: () => callBack(false)
				});
			}
		}
	};
	return { data, requests };
};

/**
 * Builds `count` rows with numeric ids starting at `start`.
 *
 * @param {number} start
 * @param {number} count
 * @returns {Array<object>}
 */
export const makeRows = (start, count) =>
	Array.from({ length: count }, (_, i) => ({ id: start + i, name: `Row ${start + i}` }));
