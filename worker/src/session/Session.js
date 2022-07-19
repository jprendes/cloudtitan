/* eslint-disable no-await-in-loop */
import Evented from "cloudtitan-common/events/Evented.js";
import Owner from "cloudtitan-common/events/Owner.js";
import Watchdog from "cloudtitan-common/utils/Watchdog.js";

import Sandbox from "./Sandbox.js";

class Session extends Evented {
    #ready = null;
    #sandbox = null;

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

    resize(...size) {
        this.#sandbox.resize(...size);
    }

    #onCommandData = (data) => {
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
            this.#consoleBacklog += data.toString();
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
        await this.ready();
        await this.#sandbox.writeFiles(binaries);

        const console = this.#sandbox.run("console", "-q");
        console.on("data", this.#onConsoleData);
        this.#pauseConsole();

        // Clear any data from before loading the bitstream.
        // This avoid sending data dangling from previous sessions.
        this.once("command").then(this.#clearConsole());

        commands = commands.slice();
        if (commands[0]?.[0] !== "load-bitstream") {
            commands.unshift(["load-bitstream", "/working/lowrisc_systems_chip_earlgrey_cw310_0.1.bit.orig"]);
        }

        this.#sandbox.own(Owner.timeout(timeout, () => {
            this.#sandbox.kill();
        }));

        for (const [cmd, ...args] of commands) {
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

        this.#sandbox.kill();

        this.destroy();
    }
}

export default Session;
