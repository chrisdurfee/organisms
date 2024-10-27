/**
 * Timer
 *
 * This will create a timer that will call a callback function.
 *
 * @property {number} duration - The duration of the timer.
 * @property {function} callBack - The callback function.
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
        /**
         * @property {number|null} timer
         */
		this.timer = null;

        /**
         * @property {function} callBack
         */
		this.callBack = callBack;

        /**
         * @property {number} duration
         */
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
        /**
         * This will stop the timer before starting a new one.
         */
		this.stop();

		const callBack = this.returnCallBack.bind(this);
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