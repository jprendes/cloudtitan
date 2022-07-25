/* eslint-disable camelcase */
import { signed, unsigned } from "leb128";

import {
    toArrayBuffer,
    getTypedViewConstructor,
} from "./typedArrays.js";

import TYPES from "./types.js";

class Deserilizer {
    #buffer = null;

    constructor(buffer) {
        this.#buffer = Buffer.from(toArrayBuffer(buffer));
    }

    get remaining() {
        return this.#buffer.byteLength;
    }

    read(n = 1) {
        const buff = this.#buffer.subarray(0, n);
        this.#buffer = this.#buffer.subarray(n);
        return buff;
    }

    read_uleb() {
        const l = parseInt(unsigned.decode(this.#buffer), 10);
        // eslint-disable-next-line no-bitwise
        while (this.#buffer[0] & 0x80) this.#buffer = this.#buffer.subarray(1);
        this.#buffer = this.#buffer.slice(1);
        return l;
    }

    read_ileb() {
        const l = parseInt(signed.decode(this.#buffer), 10);
        // eslint-disable-next-line no-bitwise
        while (this.#buffer[0] & 0x80) this.#buffer = this.#buffer.subarray(1);
        this.#buffer = this.#buffer.slice(1);
        return l;
    }
}

function deserialize(buffer, references = []) {
    buffer = new Deserilizer(buffer);
    const result = deserialize_impl(buffer, references);
    if (buffer.remaining > 0) throw new Error("Invalid serialized value. Buffer not fully consumed.");
    return result;
}

function deserialize_impl(buffer, references) {
    const tag = buffer.read(1).toString();

    if (tag === TYPES.TRUE) return true;
    if (tag === TYPES.FALSE) return false;
    if (tag === TYPES.UNDEFINED) return;
    if (tag === TYPES.NULL) return null;
    if (tag === TYPES.INTEGER) return buffer.read_ileb();

    if (tag === TYPES.REFERENCE) {
        const ref = buffer.read_uleb();
        if (!references[ref]) {
            throw new Error("Invalid serialized value. Invalid reference.");
        }
        return references[ref].value;
    }

    const ref = { value: null };
    references.push(ref);

    if (tag === TYPES.NUMBER) {
        [ref.value] = new Float64Array(toArrayBuffer(buffer.read(8)));
        return ref.value;
    }
    if (tag === TYPES.STRING) {
        const l = buffer.read_uleb();
        ref.value = buffer.read(l).toString();
        return ref.value;
    }
    if (tag === TYPES.ARRAY) {
        const l = buffer.read_uleb();
        ref.value = [];
        for (let i = 0; i < l; ++i) {
            ref.value.push(deserialize_impl(buffer, references));
        }
        return ref.value;
    }
    if (tag === TYPES.MAP) {
        const l = buffer.read_uleb();
        ref.value = new Map();
        for (let i = 0; i < l; ++i) {
            const key = deserialize_impl(buffer, references);
            const value = deserialize_impl(buffer, references);
            ref.value.set(key, value);
        }
        return ref.value;
    }
    if (tag === TYPES.SET) {
        const l = buffer.read_uleb();
        ref.value = new Set();
        for (let i = 0; i < l; ++i) {
            ref.value.add(deserialize_impl(buffer, references));
        }
        return ref.value;
    }
    if (tag === TYPES.BUFFER) {
        const t = buffer.read_uleb();
        const l = buffer.read_uleb();
        const ctor = getTypedViewConstructor(t);
        ref.value = ctor(toArrayBuffer(buffer.read(l)));
        return ref.value;
    }
    if (tag === TYPES.OBJECT) {
        const l = buffer.read_uleb();
        ref.value = {};
        for (let i = 0; i < l; ++i) {
            const ll = buffer.read_uleb();
            const key = buffer.read(ll).toString();
            const value = deserialize_impl(buffer, references);
            ref.value[key] = value;
        }
        return ref.value;
    }

    throw new Error(`Invalid serialized value. Unknown type tag '${Buffer.from(tag).toString("hex")}'.`);
}

export default deserialize;
