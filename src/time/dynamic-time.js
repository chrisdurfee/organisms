import { Span } from "@base-framework/atoms";
import { Component, SimpleData } from "@base-framework/base";
import { IntervalTimer } from "src/utils/timer/interval-timer.js";

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
 * @constant
 * @type {IntervalTimer} timer
 */
const timer = new IntervalTimer(MINUTE_INTERVAL, () =>
{
	data.increment('date');
});

/**
 * This will start the timer to update any dynamic time
 * elements.
 */
timer.start();

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