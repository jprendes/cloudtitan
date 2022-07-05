import { watch, access } from "fs/promises";
import { parse } from "path";

import Evented from "../utils/Evented.js";
import Process from "../utils/Process.js";
import { ROOT, OPENTITANTOOL } from "../config.js";

const CONF = [
    "--interface=cw310",
    `--conf=${ROOT}/config/opentitantool/config.d/opentitan_cw310.json`,
];
const ENV = {
    XDG_CONFIG_HOME: `${ROOT}/config`,
};

const exists = async (path) => {
    try {
        await access(path);
        return true;
    } catch (e) {
        return false;
    }
};

class Session extends Evented {
    #timeout = null;
    #console = null;
    #command = null;
    #ready = null;

    constructor(timeout) {
        super();
        this.#ready = this.#init(timeout);
    }

    #spawn = (...args) => {
        const opts = { env: ENV };
        if (this.#size) {
            [opts.cols, opts.rows] = this.#size;
        }
        return new Process(OPENTITANTOOL, [
            ...CONF, ...args,
        ], opts);
    };

    // eslint-disable-next-line class-methods-use-this
    #watch = async (path, timeout = 10e3) => {
        const { dir, base } = parse(path);
        const ac = new AbortController();
        const { signal } = ac;
        setTimeout(() => ac.abort(), timeout);
        const watcher = watch(dir, { signal });
        for await (const { filename } of watcher) {
            if (filename === base) {
                if (await exists(path)) {
                    ac.abort();
                    return true;
                }
            }
        }
        return false;
    };

    #reloadusb = async () => {
        const watchers = Promise.all([
            this.#watch("/dev/ttyACM0"),
            this.#watch("/dev/ttyACM1"),
        ]);
        await new Process("cloudtitan-reloadusb").wait();
        await watchers;
    };

    #init = async (timeout) => {
        // Run the reload usb command to avoid the sporadic driver problem
        await this.#reloadusb();

        if (timeout > 0) {
            this.#timeout = setTimeout(this.#onTimeout, timeout);
        }

        this.#console = this.#spawn("console", "-q", "--baudrate", "115200");
        this.#console.on("data", (data) => this.emit("console", data));
        this.own(this.#console);
        return this;
    };

    #onTimeout = () => {
        this.emit("timeout");
        this.#end?.();
    };

    get ended() { return !!this.#console?.exited; }
    #end = () => {
        this.#console?.kill();
        this.#command?.kill();
        clearTimeout(this.#timeout);
        this.#end = null;
        this.emit("end");
        this.destroy();
    };

    #size = null;
    resize(size) {
        this.#size = size;
        this.#resize();
    }

    #resize = () => {
        if (!this.#size) return;
        this.#console?.resize(...this.#size);
        this.#command?.resize(...this.#size);
    };

    kill() {
        this.#end?.();
    }

    ready() {
        return this.#ready;
    }

    async wait() {
        await this.ready();
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
}

export default Session;
