import Owner from "./Owner.js";

class Evented extends Owner {
    #listeners = new Map();
    #aliases = new WeakMap();

    on(evts, f, { once = false } = {}) {
        this.off(evts, f);

        if (evts === "*") {
            // Parse "*" as an array of events so that the
            // event name goes as the first argument
            evts = ["*"];
        }

        let ff = f;
        if (!Array.isArray(evts)) {
            const orig = ff;
            ff = (evt, ...args) => orig(...args);
        }

        if (once) {
            const orig = ff;
            ff = (...args) => {
                this.off(evts, f);
                return orig(...args);
            };
        }
        for (const evt of [...new Set([].concat(evts))]) {
            let listeners = this.#listeners.get(evt);
            if (!listeners) {
                listeners = new Set();
                this.#listeners.set(evt, listeners);
            }
            listeners.add(ff);

            let aliases = this.#aliases.get(f);
            if (!aliases) {
                aliases = new Map();
                this.#aliases.set(f, aliases);
            }
            aliases.set(evt, ff);
        }

        return {
            remove: () => this.off(evts, f),
        };
    }

    off(evts, f) {
        for (const evt of [...new Set([].concat(evts))]) {
            const listeners = this.#listeners.get(evt);
            if (!listeners) continue;

            const aliases = this.#aliases.get(f);
            if (!aliases) continue;

            const alias = aliases.get(evt);
            if (!alias) continue;

            listeners.delete(alias);

            if (listeners.size === 0) {
                this.#listeners.delete(evt);
            }

            aliases.delete(evt);
            if (aliases.size === 0) {
                this.#aliases.delete(f);
            }
        }
    }

    once(evts, f) {
        if (!f) {
            return new Promise((resolve, reject) => {
                this.once(["destroy"].concat(evts), (evt, ...args) => {
                    if (![].concat(evts).includes(evt)) {
                        // This is the "destroy" we added
                        reject(new Error("Object has been destroyed"));
                    } else if (Array.isArray(evts)) {
                        resolve([evt, ...args]);
                    } else {
                        resolve(args);
                    }
                });
            });
        }
        return this.on(evts, f, { once: true });
    }

    emit(evt, ...args) {
        const listeners = this.#listeners.get(evt);
        if (listeners) {
            for (const f of listeners) {
                f(evt, ...args);
            }
        }
        const wildcards = this.#listeners.get("*");
        if (wildcards) {
            for (const f of wildcards) {
                f(evt, ...args);
            }
        }
    }

    destroy() {
        this.emit("destroy");
        this.#listeners = new Map();
        this.#aliases = new WeakMap();
        super.destroy();
    }
}

export default Evented;
