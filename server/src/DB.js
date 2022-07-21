import { Level } from "level";
import * as pkg from "cloudtitan-common/comm/Packager.js";
import { DB_ROOT } from "./config.js";

function serialize(value) {
    return Buffer.concat([Buffer.from("pkg1"), pkg.serialize(value)]);
}

function deserialize(buffer) {
    if (buffer.slice(0, 4).toString() === "pkg1") {
        return pkg.deserialize(buffer.slice(4));
    }
    return JSON.parse(buffer.toString());
}

const db = new Level(DB_ROOT, { valueEncoding: "buffer" });

class DB {
    #db = null;

    constructor(name = "") {
        if (!name) {
            this.#db = db;
        } else {
            this.#db = db.sublevel(name, { valueEncoding: "buffer" });
        }
    }

    set(key, value) {
        value = serialize(value);
        return this.#db.put(key, value);
    }

    async get(key) {
        const [value] = await this.#db.getMany([key]);
        return deserialize(value);
    }

    delete(key) {
        this.#db.del(key);
    }

    async* iterator() {
        for await (const [key, value] of this.#db.iterator()) {
            yield [key, deserialize(value)];
        }
    }

    async* keys() {
        for await (const key of this.#db.keys()) {
            yield key;
        }
    }

    async* values() {
        for await (const value of this.#db.values()) {
            yield deserialize(value);
        }
    }
}

export default DB;
