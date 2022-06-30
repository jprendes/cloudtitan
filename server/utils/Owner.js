class Evented {
    #owned = new Set();

    own(obj) {
        this.#owned.add(obj);
        return {
            release() {
                this.#owned.delete(obj);
            },
        }
    }

    destroy() {
        for (const obj of this.#owned) {
            if (obj.destroy) {
                obj.destroy();
            } else if (obj.remove) {
                obj.remove();
            }
        }
    }
}

export default Evented;