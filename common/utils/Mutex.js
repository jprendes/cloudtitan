import Deferred from "./Deferred.js";

class Mutex {
    #count = 0;
    #exclusive = null;
    #shared = null;

    async shared(f) {
        while (this.#exclusive) {
            // eslint-disable-next-line no-await-in-loop
            await this.#exclusive;
        }

        this.#shared = this.#shared || new Deferred();
        this.#count += 1;
        try {
            return await f();
        } finally {
            this.#count -= 1;
            if (this.#count === 0) {
                const shared = this.#shared;
                this.#shared = null;
                shared.resolve();
            }
        }
    }

    async exclusive(f) {
        while (this.#shared || this.#exclusive) {
            // eslint-disable-next-line no-await-in-loop
            await (this.#shared || this.#exclusive);
        }

        this.#exclusive = new Deferred();
        try {
            return await f();
        } finally {
            const exclusive = this.#exclusive;
            this.#exclusive = null;
            exclusive.resolve();
        }
    }
}

export default Mutex;
