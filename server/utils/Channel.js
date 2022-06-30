import Evented from "./Evented.js";

class Channel extends Evented {
    #backlog = [];
    get pending() { return this.#backlog.length; }

    push(task) {
        if (this.closed) throw new Error("Channel is closed");
        this.#backlog.push(task);
        this.emit("push");
        this.emit("task");
    }

    unshift(task) {
        if (this.closed) throw new Error("Channel is closed");
        this.#backlog.unshift(task);
        this.emit("unshift");
        this.emit("task");
    }

    #closed = false;
    get closed() { return this.#closed; }
    get ended() { return this.closed && this.pending === 0; }
    close() {
        this.#closed = true;
        this.emit("close");
        if (this.ended) this.#end();
    }

    #next() {
        if (this.pending > 0) {
            const elem = {
                value: this.#backlog.shift(),
                done: false,
            };
            if (this.ended) this.#end();
            return elem;
        }
        if (this.closed) {
            this.#workers -= 1;
            return {
                done: true,
            };
        }
        return null;
    }

    #end = () => {
        this.emit("end");
        super.destroy();
    }

    #workers = 0;
    get workers() { return this.#workers; }

    get work() {
        return {
            [Symbol.asyncIterator]: () => {
                this.#workers += 1;
                return {
                    next: () => {
                        const elem = this.#next();
                        if (elem) return elem;
                        this.emit("starved");
                        return new Promise((resolve) => {
                            const listener = this.on(["task", "close"], () => {
                                const elem = this.#next();
                                if (elem) {
                                    listener.remove();
                                    resolve(elem);
                                }
                            });
                        });
                    },
                    return: () => {
                        // This will be reached if the consumer called
                        //  'break' or 'return' early in the loop.
                        this.#workers -= 1;
                        return { done: true };
                    },
                };
            }
        }
    }

    destroy() {
        this.close();
    }
}

export default Channel;
