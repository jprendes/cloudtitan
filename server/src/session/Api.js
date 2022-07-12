import { readFileSync } from "fs";
import { gzipSync } from "zlib";
import { basename } from "path";

import Evented from "cloudtitan-common/events/Evented.js";
import Owner from "cloudtitan-common/events/Owner.js";

import { ROOT } from "../config.js";

const defaultBitstream = gzipSync(readFileSync(`${ROOT}/assets/lowrisc_systems_chip_earlgrey_cw310_0.1.bit.orig`));
const defaultFirmware = gzipSync(readFileSync(`${ROOT}/assets/hello_world_fpga_cw310.bin`));

function clampInt(x, min, max) {
    [, x] = [parseInt(x, 10), min, max].sort((a, b) => a - b);
    return x;
}

class Api extends Evented {
    #status = "pending";
    #queue = null;

    #timeout = 0;
    #session = null;

    #finished = null;

    #binaries = new Map([
        ["/working/lowrisc_systems_chip_earlgrey_cw310_0.1.bit.orig", defaultBitstream],
        ["/working/hello_world_fpga_cw310.bin", defaultFirmware],
    ]);

    constructor(queue, timeout = 300e3) {
        super();

        this.#timeout = timeout;
        this.#queue = queue;
        this.#finished = this.once("finished");
    }

    commands = [];

    wait() {
        return this.#finished;
    }

    upload(name, binary) {
        name = basename(name);
        this.#binaries.set(`/working/${name}`, binary);
        return `/working/${name}`;
    }

    get binaries() {
        return [...this.#binaries.keys()];
    }

    get status() {
        return this.#status;
    }

    #size = null;
    resize(cols, rows) {
        this.#size = [clampInt(cols, 20, 300), clampInt(rows, 6, 100)];
        this.#session?.resize(this.#size);
    }

    get position() {
        return this.#queue.position(this.#task);
    }

    #changeStatus(status) {
        this.#status = status;
        this.emit("status", this.status, this.position);
        this.emit(status, this.position, this.#queue.workers);
    }

    async #runTask(session) {
        try {
            this.#session = session;
            await this.#session.ready();
            if (this.#size) this.#session.resize(this.#size);
            this.#session.on(["console", "command", "prompt", "error"], (evt, ...args) => this.emit(evt, ...args));
            await this.#session.start(this.#binaries, this.commands.slice(), this.#timeout);
            await this.#session.destroy();
            this.#session = null;
        } finally {
            this.#session = null;
        }
    }

    #task = null;
    async queue() {
        if (this.#status !== "pending") {
            throw new Error("Session already started or finished");
        }

        try {
            /*
            this.#queue.push(async () => Owner.timeout(2e3));
            this.#queue.push(async () => Owner.timeout(2e3));
            this.#queue.push(async () => Owner.timeout(2e3));
            this.#queue.push(async () => Owner.timeout(2e3));
            this.#queue.push(async () => Owner.timeout(2e3));
            */

            const handler = this.#queue.on(["tick", "worker", "task"], () => this.#changeStatus("queued"));

            this.#task = async (session) => {
                handler.remove();

                this.#changeStatus("started");

                try {
                    await this.#runTask(session);
                } catch (err) {
                    this.emit("error", "Session failed. Restarting.");
                    this.#changeStatus("queued");
                    throw err;
                }

                this.#changeStatus("finished");
            };

            this.#queue.push(this.#task);

            this.#changeStatus("queued");
        } catch (err) {
            console.error(err);
            throw new Error("Internal server error running session");
        }
    }
}

export default Api;
