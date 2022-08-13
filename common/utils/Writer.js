import { readlinkSync } from "fs";

import colors from "ansi-colors";

const metadata = new Map();

function concat(...data) {
    return Buffer.concat(data.map((chunk) => Buffer.from(chunk))).toString();
}

function getEndColumn(str, startColumn = 0) {
    str = str.replace(/\r/g, "\n");
    str = `${"".padStart(startColumn)}${str}`;
    str = colors.unstyle(str);
    return str.split("\n").pop().length;
}

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

class Writer {
    static get stdout() {
        return new Writer(process.stdout);
    }

    static get stderr() {
        return new Writer(process.stderr);
    }

    #output = null;
    #metadata = null;

    constructor(output = process.stdout) {
        this.#output = output;
        this.#metadata = getMetadata(output, () => ({ x: 0 }));
    }

    get columns() {
        if (!this.#output.isTTY) return 80;
        return this.#output.columns;
    }

    print(...data) {
        const str = concat(...data);
        this.#metadata.x = getEndColumn(str, this.#metadata.x);
        this.#output.write(str);
        return this;
    }

    println(...data) {
        let str = concat(...data);
        str = `\r\x1b[2K${str}`;

        if (this.#metadata.x > 0) str = `\r\n${str}`;
        if (getEndColumn(str, this.#metadata.x) !== 0) str = `${str}\r\n`;

        this.#metadata.x = 0;
        this.#output.write(str);
        return this;
    }
}

const {
    stdout, stderr,
} = Writer;

export default Writer;
export {
    stdout, stderr,
};
