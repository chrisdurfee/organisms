import { Timer } from './timer.js';

/**
 * IntervalTimer
 *
 * This will create a timer that will call a callback function.
 *
 * @class
 */
export class IntervalTimer extends Timer
{
	/**
	 * This will create a timer.
	 *
	 * @protected
	 * @param {function} callBack
	 * @returns {void}
	 */
	createTimer(callBack)
	{
		this.timer = window.setInterval(callBack, this.duration);
	}

	/**
	 * This will stop the timer.
	 *
	 * @returns {void}
	 */
	stop()
	{
		window.clearInterval(this.timer);
	}
}