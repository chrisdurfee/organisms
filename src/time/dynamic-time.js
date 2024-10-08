import { Span } from "@base-framework/atoms";
import { Component, SimpleData } from "@base-framework/base";
import { IntervalTimer } from "src/utils/timer";

/**
 * This will createa simple flat data object to use to bind
 * timer update.
 */
const data = new SimpleData({
    date: 0
});

/**
 * This will update the the data value every minute.
 */
const MINUTE_INTERVAL = 60000;
const timer = new IntervalTimer(MINUTE_INTERVAL, () =>
{
    data.increment('date');
});

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
     * This will set up the component data.
     *
     * @returns {object}
     */
    setData()
    {
        return data;
    }

    /**
     * This will redner the component.
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