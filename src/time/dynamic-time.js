import { Span } from "@base-framework/atoms";
import { Component, SimpleData } from "@base-framework/base";

/**
 * Returns whether the document is currently hidden (background tab).
 *
 * @returns {boolean}
 */
const isDocumentHidden = () => (typeof document !== 'undefined' && document.hidden === true);

/**
 * Creates a ref-counted ticker shared by every mounted time element.
 *
 * - It only runs while at least one element holds a reference.
 * - Each tick is aligned to the next wall-clock boundary of the interval
 *   (the next whole minute or second), so the elements update when the
 *   clock does instead of up to one interval late.
 * - It pauses while the document is hidden and, once the document is
 *   visible again, ticks immediately (the shown times may be stale) and
 *   then realigns.
 *
 * @param {number} interval
 * @param {function} tick
 * @returns {{ retain: function(): void, release: function(): void }}
 */
const createSharedTicker = (interval, tick) =>
{
	let refs = 0;

	/**
	 * @type {any}
	 */
	let timer = null;

	/**
	 * Schedules the next tick on the next wall-clock boundary.
	 *
	 * @returns {void}
	 */
	const schedule = () =>
	{
		const delay = interval - (Date.now() % interval);
		timer = globalThis.setTimeout(() =>
		{
			timer = null;
			tick();
			schedule();
		}, delay);
	};

	/**
	 * Cancels the pending tick.
	 *
	 * @returns {void}
	 */
	const clear = () =>
	{
		if (timer !== null)
		{
			globalThis.clearTimeout(timer);
			timer = null;
		}
	};

	/**
	 * Pauses while hidden and resumes with an immediate tick.
	 *
	 * @returns {void}
	 */
	const onVisibilityChange = () =>
	{
		if (refs === 0)
		{
			return;
		}

		if (isDocumentHidden())
		{
			clear();
			return;
		}

		if (timer === null)
		{
			tick();
			schedule();
		}
	};

	return {
		/**
		 * Starts the ticker when the first element mounts.
		 *
		 * @returns {void}
		 */
		retain()
		{
			if (++refs !== 1)
			{
				return;
			}

			if (typeof document !== 'undefined')
			{
				document.addEventListener('visibilitychange', onVisibilityChange);
			}

			if (!isDocumentHidden())
			{
				schedule();
			}
		},

		/**
		 * Stops the ticker when the last element unmounts.
		 *
		 * @returns {void}
		 */
		release()
		{
			if (refs === 0 || --refs !== 0)
			{
				return;
			}

			clear();
			if (typeof document !== 'undefined')
			{
				document.removeEventListener('visibilitychange', onVisibilityChange);
			}
		}
	};
};

/**
 * This will create a simple flat data object to use to bind
 * timer update. This will be used to update the time every
 * minute.
 *
 * This data will be bound to all the dynamic time elements.
 *
 * @constant
 * @type {SimpleData} data
 */
const data = new SimpleData({
	date: 0
});

/**
 * @constant
 * @type {number} MINUTE_INTERVAL
 */
const MINUTE_INTERVAL = 60000;

/**
 * This will update the data value on every wall-clock minute.
 *
 * The timer is NOT started at import time. It is ref-counted and only
 * runs while at least one DynamicTime element is mounted and the
 * document is visible, so apps that import this module (or show no time
 * elements, or sit in a background tab) pay no recurring timer cost, and
 * tree-shaking with `sideEffects: false` stays safe.
 *
 * @constant
 */
const minuteTicker = createSharedTicker(MINUTE_INTERVAL, () =>
{
	data.increment('date');
});

/**
 * This will start the minute timer when the first element mounts.
 *
 * @returns {void}
 */
const retainMinuteTimer = () => minuteTicker.retain();

/**
 * This will stop the minute timer when the last element unmounts.
 *
 * @returns {void}
 */
const releaseMinuteTimer = () => minuteTicker.release();

/**
 * This will create a simple flat data object that is bound to all
 * the dynamic second time elements. It is kept separate from the
 * minute data so minute elements are not re-rendered every second.
 *
 * @constant
 * @type {SimpleData} secondData
 */
const secondData = new SimpleData({
	date: 0
});

/**
 * @constant
 * @type {number} SECOND_INTERVAL
 */
const SECOND_INTERVAL = 1000;

/**
 * This will update the second data value on every wall-clock second.
 *
 * Like the minute timer, this is ref-counted, only runs while at least
 * one DynamicSecondTime element is mounted and pauses while hidden.
 *
 * @constant
 */
const secondTicker = createSharedTicker(SECOND_INTERVAL, () =>
{
	secondData.increment('date');
});

/**
 * This will start the second timer when the first element mounts.
 *
 * @returns {void}
 */
const retainSecondTimer = () => secondTicker.retain();

/**
 * This will stop the second timer when the last element unmounts.
 *
 * @returns {void}
 */
const releaseSecondTimer = () => secondTicker.release();

/**
 * DynamicTime
 *
 * This will create a dynamic time element that will update
 * the time every minute.
 *
 * @property {string} dateTime - The date time to display.
 * @property {function} [filter] - The filter to apply to the date time.
 *
 * @class
 * @augments Component
 */
export class DynamicTime extends Component
{
	/**
	 * This will set up the component data with the
	 * data created above.
	 *
	 * @returns {object}
	 */
	setData()
	{
		return data;
	}

	/**
	 * This will retain the shared timer when the element mounts.
	 *
	 * @returns {void}
	 */
	afterSetup()
	{
		this.retainTimer();
	}

	/**
	 * This will release the shared timer when the element unmounts.
	 *
	 * @returns {void}
	 */
	beforeDestroy()
	{
		this.releaseTimer();
	}

	/**
	 * This will retain the minute timer.
	 *
	 * @protected
	 * @returns {void}
	 */
	retainTimer()
	{
		retainMinuteTimer();
	}

	/**
	 * This will release the minute timer.
	 *
	 * @protected
	 * @returns {void}
	 */
	releaseTimer()
	{
		releaseMinuteTimer();
	}

	/**
	 * This will render the component.
	 *
	 * @returns {object}
	 */
	render()
	{
		return Span({
			// @ts-ignore
			class: this.class,
			text: this.getTime(),
			onSet: ['date', () => this.getTime()]
		});
	}

	/**
	 * This will get the date and check to filter the value.
	 *
	 * @returns {string}
	 */
	getTime()
	{
		// @ts-ignore
		const dateTime = this.dateTime;
		// @ts-ignore
		return (this.filter) ? this.filter(dateTime) : dateTime;
	}
}

/**
 * DynamicSecondTime
 *
 * This will create a dynamic time element that will update
 * the time every second.
 *
 * @property {string} dateTime - The date time to display.
 * @property {function} [filter] - The filter to apply to the date time.
 *
 * @class
 * @augments DynamicTime
 */
export class DynamicSecondTime extends DynamicTime
{
	/**
	 * This will set up the component data with the second
	 * data created above so it updates every second.
	 *
	 * @returns {object}
	 */
	setData()
	{
		return secondData;
	}

	/**
	 * This will retain the second timer.
	 *
	 * @protected
	 * @returns {void}
	 */
	retainTimer()
	{
		retainSecondTimer();
	}

	/**
	 * This will release the second timer.
	 *
	 * @protected
	 * @returns {void}
	 */
	releaseTimer()
	{
		releaseSecondTimer();
	}
}