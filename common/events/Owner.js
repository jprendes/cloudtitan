class Owner {
    #owned = new Set();

    own(obj) {
        this.#owned.add(obj);
        return obj;
    }

    release(obj) {
        this.#owned.delete(obj);
        return obj;
    }

    destroy() {
        for (const obj of this.#owned) {
            if (obj.destroy) {
                obj.destroy();
            } else if (obj.remove) {
                obj.remove();
            }
        }
        this.#owned = new Set();
    }

    static timeout(t, f) {
        if (!f) {
            return new Promise((resolve) => Owner.timeout(t, resolve));
        }
        let id = setTimeout(() => {
            id = null;
            f();
        }, t);
        return {
            remove() {
                if (id !== null) clearTimeout(id);
            },
        };
    }

    static interval(t, f) {
        let id = setInterval(f, t);
        return {
            remove() {
                if (id !== null) clearInterval(id);
                id = null;
            },
        };
    }

    static async scoped(f) {
        const owner = new Owner();
        try {
            return await f(owner);
        } finally {
            owner.destroy();
        }
    }
}

export default Owner;
