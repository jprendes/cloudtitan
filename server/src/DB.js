import { Level } from "level";
import * as pkg from "cloudtitan-common/comm/Packager.js";
import opts from "./main.js";

function serialize(value) {
    return Buffer.concat([Buffer.from("pkg1"), pkg.serialize(value)]);
}

function deserialize(buffer) {
    if (buffer.slice(0, 4).toString("binary") === "pkg1") {
        return pkg.deserialize(buffer.slice(4));
    }
    return JSON.parse(buffer.toString());
}

async function toVector(it) {
    const res = [];
    for await (const i of it) {
        res.push(i);
    }
    return res;
}

class DB {
    #db = null;

    constructor(db) {
        this.#db = db;
    }

    set(key, value) {
        value = serialize(value);
        return this.#db.put(key, value);
    }

    async get(key) {
        const [value] = await this.#db.getMany([key]);
        return value && deserialize(value);
    }

    delete(key) {
        this.#db.del(key);
    }

    async* #iterator() {
        for await (const [key, value] of this.#db.iterator()) {
            yield [key, deserialize(value)];
        }
    }

    iterator() {
        const it = this.#iterator();
        it.toVector = () => toVector(it);
        return it;
    }

    async* #keys() {
        for await (const key of this.#db.keys()) {
            yield key;
        }
    }

    keys() {
        const it = this.#keys();
        it.toVector = () => toVector(it);
        return it;
    }

    async* #values() {
        for await (const value of this.#db.values()) {
            yield deserialize(value);
        }
    }

    values() {
        const it = this.#values();
        it.toVector = () => toVector(it);
        return it;
    }

    sublevel(...name) {
        let db = this.#db;
        for (const part of name) {
            db = db.sublevel(part, { valueEncoding: "buffer" });
        }
        return new DB(db);
    }
}

const db = new DB(new Level(opts.database, { valueEncoding: "buffer" }));

export default db;
