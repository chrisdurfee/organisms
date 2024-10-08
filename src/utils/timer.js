/**
 * Timer
 *
 * This will create a timer that will call a callback function.
 *
 * @class
 */
export class Timer
{
    /**
     * This will create a new timer.
     *
     * @param {number} duration
     * @param {function} callBack
     */
	constructor(duration, callBack)
	{
		this.timer = null;
		this.callBack = callBack;
		this.duration = duration || 1000;
	}

    /**
     * This will create a timer.
     *
     * @protected
     * @param {function} callBack
     * @returns {void}
     */
	createTimer(callBack)
	{
		this.timer = window.setTimeout(callBack, this.duration);
	}

    /**
     * This will start the timer.
     *
     * @returns {void}
     */
	start()
	{
		this.stop();
		let callBack = this.returnCallBack.bind(this);
		this.createTimer(callBack);
	}

    /**
     * This will stop the timer.
     *
     * @returns {void}
     */
	stop()
	{
		window.clearTimeout(this.timer);
	}

    /**
     * This will call the callback function.
     *
     * @private
     * @returns {void}
     */
	returnCallBack()
	{
		const callBack = this.callBack;
		if (typeof callBack === 'function')
		{
			callBack.call();
		}
	}
}

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