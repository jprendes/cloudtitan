import { spawn } from "node-pty";
import Evented from "./Evented.js";

class Process extends Evented {
    #child = null;
    #exit = null;

    constructor(program, args = [], opts = {}) {
        super();
        this.#child = spawn(program, args, {
            ...opts,
            stdio: "pipe",
        });
        this.#child.onExit(() => this.#end?.());
        this.#exit = new Promise((resolve) => {
            this.on("end", resolve);
        });
        this.#child.onData((data) => this.emit("data", data));
    }

    #end = () => {
        this.#child = null;
        this.emit("end");
        this.#end = null;
        this.destroy();
    };

    resize(cols, rows) {
        this.#child?.resize(cols - 1, rows - 1);
        this.#child?.resize(cols, rows);
    }

    get exited() {
        return this.#child === null;
    }

    wait() {
        return this.#exit;
    }

    kill(signal = "SIGKILL") {
        this.#child?.kill(signal);
        this.emit("kill");
    }

    write(data) {
        this.#child?.write(data);
    }

    destroy() {
        this.#end?.();
        super.destroy();
    }
}

export default Process;
