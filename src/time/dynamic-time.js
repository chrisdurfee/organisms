import { Span } from "@base-framework/atoms";
import { Component, SimpleData } from "@base-framework/base";
import { IntervalTimer } from "../utils/timer/interval-timer.js";

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
 * This will update the the data value every minute.
 *
 * The timer is NOT started at import time. It is ref-counted and only
 * runs while at least one DynamicTime element is mounted, so apps that
 * import this module (or show no time elements) pay no recurring timer
 * cost, and tree-shaking with `sideEffects: false` stays safe.
 *
 * @constant
 * @type {IntervalTimer} timer
 */
const timer = new IntervalTimer(MINUTE_INTERVAL, () =>
{
	data.increment('date');
});

/**
 * Number of mounted DynamicTime elements sharing the minute timer.
 *
 * @type {number}
 */
let minuteRefs = 0;

/**
 * This will start the minute timer when the first element mounts.
 *
 * @returns {void}
 */
const retainMinuteTimer = () =>
{
	if (++minuteRefs === 1)
	{
		timer.start();
	}
};

/**
 * This will stop the minute timer when the last element unmounts.
 *
 * @returns {void}
 */
const releaseMinuteTimer = () =>
{
	if (minuteRefs > 0 && --minuteRefs === 0)
	{
		timer.stop();
	}
};

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
 * This will update the second data value every second.
 *
 * Like the minute timer, this is ref-counted and only runs while at
 * least one DynamicSecondTime element is mounted.
 *
 * @constant
 * @type {IntervalTimer} secondTimer
 */
const secondTimer = new IntervalTimer(SECOND_INTERVAL, () =>
{
	secondData.increment('date');
});

/**
 * Number of mounted DynamicSecondTime elements sharing the second timer.
 *
 * @type {number}
 */
let secondRefs = 0;

/**
 * This will start the second timer when the first element mounts.
 *
 * @returns {void}
 */
const retainSecondTimer = () =>
{
	if (++secondRefs === 1)
	{
		secondTimer.start();
	}
};

/**
 * This will stop the second timer when the last element unmounts.
 *
 * @returns {void}
 */
const releaseSecondTimer = () =>
{
	if (secondRefs > 0 && --secondRefs === 0)
	{
		secondTimer.stop();
	}
};

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