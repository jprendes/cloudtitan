class ObservableMap {
    #map = null;

    #onget = null;
    #onset = null;
    #ondelete = null;

    constructor(map, {
        onget = (s, key) => s.underlying.get(key),
        onset = (s, key, val = true) => s.underlying.set(key, val),
        ondelete = (s, key) => s.underlying.delete(key),
    } = {}) {
        this.#map = map;
        this.#onget = onget;
        this.#onset = onset;
        this.#ondelete = ondelete;
    }

    get size() { return this.#map.size; }
    [Symbol.iterator]() { return this.#map.entries(); }
    values() { return this.#map.values(); }
    keys() { return this.#map.keys(); }
    entries() { return this.#map.entries(); }

    get underlying() { return this.#map; }

    has(val) {
        return this.#map.has(val);
    }

    get(...args) {
        return this.#onget(this, ...args);
    }

    set(...args) {
        return this.#onset(this, ...args);
    }

    add(...args) {
        return this.#onset(this, ...args);
    }

    delete(...args) {
        return this.#ondelete(this, ...args);
    }

    clear() {
        const result = [...this.#map.keys()].map(this.delete);
        return Promise.all(result).then(() => undefined);
    }
}

export default ObservableMap;
