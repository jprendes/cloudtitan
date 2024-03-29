import { spawn } from "node-pty";
import Evented from "cloudtitan-common/events/Evented.js";
import Buffered from "./Buffered.js";

class Process extends Evented {
    #child = null;
    #exit = null;
    #buffered = new Buffered();

    constructor(program, args = [], opts = {}) {
        super();
        this.#child = spawn(program, args, {
            ...opts,
            stdio: "pipe",
        });
        this.#child.onExit(this.#onExit);
        this.#exit = this.once(["exit", "destroy"]).then(([, reason]) => reason);
        this.#child.onData((data) => this.#buffered.push(data));
        this.#buffered.on("data", (data) => this.emit(data));
    }

    #onExit = ({ exitCode: code, signal }) => {
        this.#buffered.flush();
        this.#child = null;
        this.emit("exit", code !== null ? code : signal);
        super.destroy();
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
        this.#buffered.flush();
        this.#buffered.destroy();
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
