import { readlinkSync } from "fs";

const metadata = new Map();

function getMetadata(output, orElse = () => ({})) {
    if (metadata.has(output)) return metadata.get(output);
    let link = null;
    try {
        link = readlinkSync(`/proc/self/fd/${process.stderr.fd}`);
        if (metadata.has(link)) return metadata.get(link);
    } catch (err) {
        // no-op
    }
    const m = orElse();
    metadata.set(output, m);
    if (link) metadata.set(link, m);
    return m;
}

function progressBarTransform(str) {
    if (!str.match(/\[█×(\d+),░×(\d+),_×(\d+)\]/g)) return str;
    str = str.replace(/\[█×(\d+),░×(\d+),_×(\d+)\]/g, (_, done, todo, width) => {
        width = parseInt(width, 10);
        done = parseInt(done, 10);
        todo = parseInt(todo, 10);
        const progress = done / (done + todo);
        const available = Math.max(1, process.stdout.columns - width + done + todo);
        done = Math.round(available * progress);
        todo = available - done;
        return `[${Array(done).fill("█").join("")}${Array(todo).fill("░").join("")}]`;
    });
    return str;
}

class Writer {
    static get COLORS() {
        return {
            BLACK: 0,
            RED: 1,
            GREEN: 2,
            YELLOW: 3,
            BLUE: 4,
            MAGENTA: 5,
            CYAN: 6,
            BRIGHT_GRAY: 7,
            GRAY: 60,
            BRIGHT_RED: 61,
            BRIGHT_GREEN: 62,
            BRIGHT_YELLOW: 63,
            BRIGHT_BLUE: 64,
            BRIGHT_MAGENTA: 65,
            BRIGHT_CYAN: 66,
            WHITE: 67,
        };
    }

    static get TRANSFORMS() {
        return {
            progressBar: progressBarTransform,
        };
    }

    static get stdout() {
        return new Writer(process.stdout);
    }

    static get stderr() {
        return new Writer(process.stderr);
    }

    static pad(str, length, { align = "center", fill = " " } = {}) {
        const pad = Math.max(0, length - str.length);
        const a = Array(Math.round(pad / 2)).fill(fill).join("");
        const b = Array(pad - a.length).fill(fill).join("");
        switch (align) {
        case "left": return `${str}${a}${b}`;
        case "right": return `${a}${b}${str}`;
        case "center": default: return `${a}${str}${b}`;
        }
    }

    #modifiers = null;
    #output = null;
    #transform = null;
    #metadata = null;

    constructor(output = process.stdout, modifiers = [], transform = (x) => x) {
        this.#modifiers = modifiers;
        this.#output = output;
        this.#transform = transform;
        this.#metadata = getMetadata(output, () => ({ last: "\n" }));
    }

    get columns() {
        if (!this.#output.isTTY) return Infinity;
        return this.#output.columns;
    }

    print(...data) {
        let str = Buffer.concat(data.map((chunk) => Buffer.from(chunk))).toString();
        str = this.#transform(str);
        this.#metadata.last = str;
        if (this.#modifiers.length) {
            str = `\x1b[${this.#modifiers.join(";")}m${str}\x1b[0m`;
        }
        this.#output.write(str);
    }

    println(...data) {
        data.unshift("\r\x1b[2K");
        // eslint-disable-next-line no-control-regex
        if (!this.#metadata.last.match(/(\n|\r)(\x1b\[[\d;]*.)*$/)) {
            data.unshift("\r\n");
        }
        return this.print(...data, "\r\n");
    }

    color(color) {
        return this.foreground(color);
    }

    foreground(color) {
        return new Writer(this.#output, [...this.#modifiers, 30 + color], this.#transform);
    }

    background(color) {
        return new Writer(this.#output, [...this.#modifiers, 40 + color], this.#transform);
    }

    bold() {
        return new Writer(this.#output, [...this.#modifiers, 1], this.#transform);
    }

    transform(f) {
        return new Writer(this.#output, this.#modifiers, (str) => f(this.#transform(str)));
    }
}

const {
    stdout, stderr, COLORS, TRANSFORMS, pad,
} = Writer;

export default Writer;
export {
    stdout, stderr, COLORS, TRANSFORMS, pad,
};
