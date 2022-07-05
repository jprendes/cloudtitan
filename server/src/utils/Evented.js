import Owner from "./Owner.js";

class Evented extends Owner {
    #listeners = new Map();

    on(evts, f) {
        evts = [].concat(evts);
        const owner = new Owner();
        const ff = (...args) => f(...args);
        for (const evt of evts) {
            let listeners = this.#listeners.get(evt);
            if (!listeners) {
                listeners = new Set();
                this.#listeners.set(evt, listeners);
            }
            listeners.add(ff);
            owner.own({
                remove: () => {
                    listeners.delete(ff);
                    if (listeners.size === 0) {
                        this.#listeners.delete(evt);
                    }
                },
            });
        }
        return { remove: () => owner.destroy() };
    }

    once(evts, f) {
        const listener = this.on(evts, (...args) => {
            listener.remove();
            f(...args);
        });
        return listener;
    }

    emit(evt, ...args) {
        const listeners = this.#listeners.get(evt);
        if (!listeners) return;
        for (const f of listeners) {
            f(...args);
        }
    }

    destroy() {
        this.emit("destroy");
        this.#listeners = new Map();
        super.destroy();
    }
}

export default Evented;
