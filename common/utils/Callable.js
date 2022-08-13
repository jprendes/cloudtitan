class Callable extends Function {
    constructor(f) {
        super("f, ...args", "return f.call(this, ...args)");
        // eslint-disable-next-line no-constructor-return
        return this.bind(this, f);
    }
}

export default Callable;
