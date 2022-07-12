import { spawn } from "node-pty";
import Evented from "cloudtitan-common/events/Evented.js";

class Process extends Evented {
    #child = null;
    #exit = null;

    constructor(program, args = [], opts = {}) {
        super();
        this.#child = spawn(program, args, {
            ...opts,
            stdio: "pipe",
        });
        this.#child.onExit(this.#onExit);
        this.#exit = this.once(["exit", "destroy"]);
        this.#child.onData(this.#onData);
    }

    #onExit = () => {
        this.#child = null;
        this.emit("exit");
        super.destroy();
    };

    #onData = (data) => this.emit("data", data);

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
        if (!this.#child) return;
        this.#child.kill(signal);
        this.emit("kill");
        return this.wait();
    }

    write(data) {
        this.#child?.write(data);
    }

    destroy() {
        this.kill("SIGKILL");
    }
}

export default Process;
