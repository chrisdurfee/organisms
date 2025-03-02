import { Div } from "@base-framework/atoms";
import { Atom } from "@base-framework/base";
import { List } from "./list.js";

/**
 * Get scroll metrics for a container.
 *
 * @param {HTMLElement|Window} container
 * @returns {object} Contains scrollTop, clientHeight, and scrollHeight.
 */
function getScrollMetrics(container)
{
	// @ts-ignore
	const scrollTop = container === window ? window.pageYOffset : container.scrollTop;
	// @ts-ignore
	const clientHeight = container === window ? window.innerHeight : container.clientHeight;
	// @ts-ignore
	const scrollHeight = container === window ? document.documentElement.scrollHeight : container.scrollHeight;
	return { scrollTop, clientHeight, scrollHeight };
}

/**
 * Check if the scroll position indicates we should load more items.
 *
 * @param {object} metrics - The scroll metrics.
 * @param {number} [threshold=100] - The threshold in pixels.
 * @returns {boolean}
 */
function shouldLoadMore(metrics, threshold = 100)
{
	return metrics.scrollTop + metrics.clientHeight >= metrics.scrollHeight - threshold;
}

/**
 * A ScrollableList component that updates when its container is scrolled.
 *
 * @param {object} props
 * @property {HTMLElement} [props.scrollContainer] - The container element for scroll events. Defaults to window.
 * @property {function} [props.loadMoreItems] - A function to fetch/generate additional items.
 * @returns {object}
 */
const ScrollableList = Atom((props) =>
{
	// Determine the container for scroll events (defaults to window).
	const container = props.scrollContainer || window;

	// Scroll event handler.
	const handleScroll = (e, { list }) =>
	{
		const metrics = getScrollMetrics(container);
		if (shouldLoadMore(metrics, 100))
		{
			if (typeof props.loadMoreItems === 'function')
			{
				props.loadMoreItems((rows) =>
				{
					list.append(rows);
				});
			}
		}
	};

	return Div(
		{
			addEvent: ['scroll', window, handleScroll, { passive: true }],
		},
		[
			new List({
				cache: 'list',
				key: props.key,
				items: props.items || [],
				divider: props.divider,
				role: 'list',
				class: props.class,
				rowItem: props.rowItem
			})
		]
	);
});

export default ScrollableList;