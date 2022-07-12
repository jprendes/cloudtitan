import Evented from "cloudtitan-common/events/Evented.js";

class Channel extends Evented {
    #backlog = [];
    #running = [];

    get pending() { return this.#backlog.length; }
    get running() { return this.#backlog.length; }

    push(task) {
        if (this.closed) throw new Error("Channel is closed");
        this.#backlog.push(task);
        this.emit("task");
    }

    unshift(task) {
        // Unshifting is allowed even on closed channels.
        this.#backlog.unshift(task);
        this.emit("task");
    }

    #closed = false;
    get closed() { return this.#closed; }
    get ended() { return this.closed && this.pending === 0; }

    #closePromise = null;
    async #close() {
        this.#closed = true;
        this.emit("close");
        while (this.pending > 0 || this.running > 0) {
            // eslint-disable-next-line no-await-in-loop
            await this.once(["work", "task"]);
        }
        this.emit("end");
        super.destroy();
    }

    close() {
        this.#closePromise = this.#closePromise || this.#close();
        return this.#closePromise;
    }

    position(task) {
        const inBacklog = 1 + this.#backlog.indexOf(task);
        if (inBacklog) return inBacklog;
        if (this.#running.includes(task)) return 0;
        return NaN;
    }

    remove(task) {
        this.#backlog = this.#backlog.filter((t) => t !== task);
    }

    #workers = 0;
    get workers() { return this.#workers; }

    tasks() {
        const aborter = new Evented();
        aborter.aborted = false;
        this.on(["task", "end"], (evt, ...args) => aborter.emit(evt, ...args));
        const that = this;
        return {
            async* [Symbol.asyncIterator]() {
                that.#workers += 1;
                that.emit("worker");
                try {
                    while (true) {
                        if (aborter.aborted) {
                            break;
                        } else if (that.pending === 0) {
                            // eslint-disable-next-line no-await-in-loop
                            const [evt] = await aborter.once(["task", "end", "abort"]);
                            if (evt === "abort" || evt === "end") break;
                        } else {
                            const task = that.#backlog.shift();
                            that.#running.push(task);
                            that.emit("tick");
                            yield task;
                            that.#running.filter((t) => t !== task);
                            that.emit("work");
                        }
                    }
                } finally {
                    that.#workers -= 1;
                    that.emit("worker");
                }
            },
            abort() {
                aborter.aborted = true;
                aborter.emit("abort");
            },
        };
    }

    destroy() {
        this.close();
    }
}

export default Channel;
