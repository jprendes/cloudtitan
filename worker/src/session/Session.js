/* eslint-disable no-await-in-loop */
import Evented from "cloudtitan-common/events/Evented.js";
import Owner from "cloudtitan-common/events/Owner.js";
import Watchdog from "cloudtitan-common/utils/Watchdog.js";
import { stderr, write } from "../write.js";

import Sandbox from "./Sandbox.js";
import DemoSession from "./DemoSession.js";

class Session extends Evented {
    #ready = null;
    #sandbox = null;

    static get Demo() { return DemoSession; }

    constructor() {
        super();
        this.#ready = this.#init();
    }

    async #init() {
        this.#sandbox = new Sandbox();
        await this.#sandbox.ready();
        return this;
    }

    ready() { return this.#ready; }

    #onCommandData = (data) => {
        data = data.toString("binary");
        console.log(data);
        data = data.replace(/\[(█*)(░*)\]/g, (_, done, todo) => `[█×${done.length},░×${todo.length},_×1024]`);
        this.emit("command", data);
    };

    #consoleBacklog = "";
    #consolePaused = true;
    #clearConsole() { this.#consoleBacklog = ""; }
    #resumeConsole() {
        this.#consolePaused = false;
        if (this.#consoleBacklog) {
            this.emit("console", this.#consoleBacklog);
            this.#consoleBacklog = "";
        }
    }

    #pauseConsole() {
        this.#consolePaused = true;
    }

    #onConsoleData = (data) => {
        if (this.#consolePaused) {
            this.#consoleBacklog += data.toString("binary");
        } else {
            this.emit("console", data);
        }
    };

    async #run(...args) {
        const process = this.#sandbox.run(...args);
        process.on("data", this.#onCommandData);
        const reason = await process.wait();
        if (reason) {
            throw new Error("Child process exited abnormally");
        }
    }

    async start(binaries, commands, timeout) {
        try {
            await this.ready();
            await this.#sandbox.writeFiles(binaries);

            const console = this.#sandbox.run("console", "-q");
            console.on("data", this.#onConsoleData);
            this.#pauseConsole();

            // Clear any data from before loading the bitstream.
            // This avoid sending data dangling from previous sessions.
            this.once("command").then(this.#clearConsole()).catch(() => {});

            commands = commands.slice();
            if (commands[0]?.[0] !== "load-bitstream") {
                commands.unshift(["load-bitstream", "/working/lowrisc_systems_chip_earlgrey_cw310_0.1.bit.orig"]);
            }

            this.#sandbox.own(Owner.timeout(timeout, () => {
                this.emit("error", "Session timeout");
                this.emit("done");
                this.kill();
            }));

            for (const [cmd, ...args] of commands) {
                write(stderr, "\x1b[32m    ", [cmd, ...args].join(" "), "\r\n\x1b[0m");
                try {
                    switch (cmd) {
                    case "console": {
                        // For console we just wait, since the console is always outputed
                        const t = parseFloat(args[0], 10) || 2;
                        const watchdog = Watchdog.fromEvent(this, "console", t * 1e3);
                        this.#sandbox.own(watchdog);
                        this.#resumeConsole();
                        await watchdog.once(["alert", "destroy"]);
                        this.#pauseConsole();
                        watchdog.destroy();
                        this.#sandbox.release(watchdog);
                        break;
                    }
                    case "load-bitstream": {
                        this.emit("prompt", `${cmd} ${args.join(" ")}`);
                        await this.#run("load-bitstream", ...args);
                        await this.#run("set-pll");
                        break;
                    }
                    case "bootstrap": {
                        this.emit("prompt", `${cmd} ${args.join(" ")}`);
                        await this.#run("bootstrap", ...args);
                        break;
                    }
                    default: {
                        this.emit("error", `Skipping invalid command "${cmd}"`);
                        break;
                    }
                    }
                } catch (err) {
                    this.emit("error", `Error while running command "${cmd}"`);
                    throw err;
                }
            }

            this.emit("done");
            this.kill();
        } catch (err) {
            if (err.message !== "Sandbox has been killed") {
                throw err;
            }
        } finally {
            this.destroy();
        }
    }

    kill() {
        return this.#sandbox.kill();
    }
}

export default Session;
