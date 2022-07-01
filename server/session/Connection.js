import { readFileSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import rimraf from "rimraf";
import { v4 as uuid } from "uuid";
import Evented from "../utils/Evented.js";

import { serialize, deserialize } from "../utils/Packager.js";
import Session from "./Session.js";
import Watchdog from "../utils/Watchdog.js";

const defaultBitstream = readFileSync("./lowrisc_systems_chip_earlgrey_cw310_0.1.bit.orig");
const defaultFirmware = readFileSync("./hello_world_fpga_cw310.bin");

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Connection extends Evented {
    #status = "pending";
    #conn = null;
    #timeout = 0;
    #watchdog = 0;

    #bitstream = null;
    #firmware = [];

    #session = null;

    constructor(conn, timeout = 300e3, watchdog = 2e3) {
        super();
        this.#timeout = timeout;
        this.#watchdog = watchdog;
        this.#conn = conn;
        conn.on("message", this.#onMessage);
    }

    #onMessage = (data) => {
        try {
            const msg = deserialize(data);
            switch (msg.type) {
            case "bitstream": { return this.#onBitstream(msg.value); }
            case "firmware": { return this.#onFirmware(msg.value); }
            case "start": { return this.#onStart(msg.value); }
            case "resize": { return this.#onResize(msg.value); }
            }
        } catch (err) {
            this.#close(1002, "Invalid message");
            console.error(err.stack);
        }
    }

    #close = (code, reason) => {
        this.#conn.close(code, reason);
    }

    #size = null;
    #onResize = (size) => {
        this.#size = size;
        if (this.#status === "started") {
            this.#session.resize(size);
        }
    }

    #onBitstream = async (data) => {
        if (this.#status !== "pending") return this.#close(1002, "Session already started");
        this.emit("bitstream");
        this.#bitstream = decompress(data);
    }

    #onFirmware = async ({ data, offset }) => {
        if (this.#status !== "pending") return this.#close(1002, "Session already started");
        this.emit("firmware");
        this.#firmware.push({
            data: decompress(data),
            offset,
        });
    }

    #onStart = async () => {
        if (this.#status !== "pending") return this.#close(1002, "Session already started");
        try {
            await this.#start()
        } catch (err) {
            console.error(err);
            this.#close(1002, "Internal server error running session");
        }
    }

    #send(type, value) {
        this.#conn.send(serialize({ type, value }))
    }

    #start = async () => {
        const id = uuid();

        this.#status = "started";
        this.emit("start");
        
        if (!this.#bitstream) {
            this.#bitstream = defaultBitstream;
        }

        if (this.#firmware.length === 0) {
            this.#firmware.push({
                data: defaultFirmware,
                offset: -1,
            });
        }

        const root = `/tmp/cloudtitan-${id}`;
        await mkdir(root);

        const bitstream = (async () => {
            const path = `${root}/bitstream`;
            await writeFile(path, await this.#bitstream);
            return path;
        })();

        const firmware = Promise.all(this.#firmware.map(async (fw, i) => {
            const path = `${root}/firmware-${i}`;
            await writeFile(path, await fw.data);
            if (fw.offset !== -1) return `${path}:${fw.offset}`;
            return path;
        }));

        const session = new Session(this.#timeout);
        this.#session = session;

        if (this.#size) session.resize(this.#size);

        session.on("command", (data) => this.#send("command", data));

        this.#conn.on("close", () => session.kill());

        const loadBitstream = session.run("load-bitstream", await bitstream);

        // Wait until after we start loading the bitstream to listen to the console
        // this avoid sending data dangling from previous sessions
        await pause(100);
        session.on("console", (data) => this.#send("console", data));

        await loadBitstream;

        await session.run("set-pll");
        await session.run("bootstrap", ...await firmware);

        await new Promise((resolve) => rimraf(root, resolve));

        if (this.#watchdog > 0) {
            const watchdog = new Watchdog(this.#watchdog);
            watchdog.on("alert", () => session.kill());
            session.on("console", () => watchdog.tick());
        }

        await session.wait();

        this.#session = null;

        this.#status = "ended";
        this.#close(1000, "Done");

        this.emit("end");
    }
}

export default Connection;
