import Evented from "../utils/Evented.js";
import Process from "../utils/Process.js";
import { OPENTITANTOOL } from "../config.js";

import { ROOT } from "../config.js";

const CONF = [
    "--interface=cw310",
    `--conf=${ROOT}/config/opentitantool/config.d/opentitan_cw310.json`,
];
const ENV = {
    XDG_CONFIG_HOME: `${ROOT}/config`,
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Session extends Evented {
    #timeout = null;
    #console = null;
    #command = null;
    
    constructor(timeout) {
        super();
        if (timeout > 0) {
            this.#timeout = setTimeout(this.#onTimeout, timeout);
        }
        this.#init();
    }

    #spawn = (...args) => {
        const opts = { env: ENV };
        if (this.#size) {
            opts.cols = this.#size[0];
            opts.rows = this.#size[1];
        }
        return new Process(OPENTITANTOOL, [
            ...CONF, ...args
        ], opts);
    }

    #init = async () => {
        // Run the reload usb command to avoid the sporadic driver problem
        await new Process("cloudtitan-reloadusb").wait();
        await pause(100);

        this.#console = this.#spawn("console", "-q", "--baudrate", "115200");
        this.#console.on("data", (data) => this.emit("console", data));
        this.own(this.#console);
    }

    #onTimeout = () => {
        this.emit("timeout");
        this.#end?.();
    }

    get ended() { return this.#console.exited; }
    #end = () => {
        this.#console.kill();
        this.#command?.kill();
        clearTimeout(this.#timeout);
        this.#end = null;
        this.emit("end");
        this.destroy();
    }

    #size = null;
    resize(size) {
        this.#size = size;
        this.#resize();
    }

    #resize = () => {
        if (!this.#size) return;
        this.#console?.resize(...this.#size);
        this.#command?.resize(...this.#size);
    }

    kill() {
        this.#end?.();
    }

    wait() {
        return this.#console.wait();
    }

    async run(...args) {
        if (this.ended) return null;
        if (this.#command) {
            this.#command.kill();
        }
        const control = this.#spawn(...args);
        control.on("data", (data) => this.emit("command", data));
        this.own(control);
        control.on("exit", () => {
            this.#command = null;
            this.release(control);
            control.destroy();
        });
        this.#command = control;
        await control.wait();
        control.destroy();
    }

    destroy() {
        this.#end?.();
        super.destroy();
    }
};

export default Session;
