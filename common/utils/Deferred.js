class Deferred {
    #promise = null;

    constructor() {
        this.#promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }

    then(...args) { return this.#promise.then(...args); }
}

export default Deferred;
