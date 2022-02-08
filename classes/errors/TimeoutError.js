
export class TimeoutError extends Error {
    constructor (seconds) {
        super('Таймаут на ' + seconds + ' секунд');
        this.timeout = seconds;
    }
}