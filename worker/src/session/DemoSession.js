import Evented from "cloudtitan-common/events/Evented.js";

import events from "./demo.js";

const sleep = (t) => new Promise((r) => setTimeout(r, t));

class DemoSession extends Evented {
    #ready = null;

    constructor() {
        super();
        this.#ready = this.#init();
    }

    async #init() {
        return this;
    }

    ready() { return this.#ready; }

    async start() {
        await this.ready();
        const [, t0] = events[0];
        await Promise.all(events.map(async ([evt, t, ...args]) => {
            await sleep(t - t0);
            this.emit(evt, ...args);
        }));
        this.destroy();
    }

    // eslint-disable-next-line class-methods-use-this
    kill() {
        // no-op
    }
}

export default DemoSession;
