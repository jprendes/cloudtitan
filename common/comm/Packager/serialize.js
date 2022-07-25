/* eslint-disable camelcase */
import { signed, unsigned } from "leb128";

import {
    toArrayBuffer,
    getTypedArrayType,
} from "./typedArrays.js";

import TYPES from "./types.js";

class Serializer {
    #buffers = [];

    push(...elems) {
        for (const elem of elems) {
            if (elem instanceof Serializer) {
                this.#buffers.push(...elem.#buffers);
            } else if (ArrayBuffer.isView(elem) || elem instanceof ArrayBuffer) {
                this.#buffers.push(Buffer.from(toArrayBuffer(elem)));
            } else if (typeof elem === "string") {
                this.#buffers.push(Buffer.from(elem));
            // eslint-disable-next-line no-bitwise
            } else if ((typeof elem === "number") && (elem | 0) === elem) {
                this.#buffers.push(unsigned.encode(elem));
            } else {
                throw new Error("Invalid element type");
            }
        }
        return this;
    }

    build() {
        const buffers = this.#buffers;
        this.#buffers = [];
        return Buffer.concat(buffers);
    }
}

function serialize(obj, references = []) {
    return serialize_impl(obj, references).build();
}

function serialize_impl(obj, references) {
    const buffers = new Serializer();

    if (obj === true) {
        return buffers.push(TYPES.TRUE);
    }
    if (obj === false) {
        return buffers.push(TYPES.FALSE);
    }
    if (typeof obj === "undefined") {
        return buffers.push(TYPES.UNDEFINED);
    }
    if (obj === null) { // null
        return buffers.push(TYPES.NULL);
    }
    // eslint-disable-next-line no-bitwise
    if ((typeof obj === "number") && (obj | 0) === obj) {
        return buffers
            .push(TYPES.INTEGER)
            .push(signed.encode(obj));
    }

    const ref = references.indexOf(obj);
    if (ref !== -1) {
        return buffers
            .push(TYPES.REFERENCE)
            .push(ref);
    }

    references.push(obj);

    if (typeof obj === "number") {
        return buffers
            .push(TYPES.NUMBER)
            .push(Float64Array.from([obj]));
    }
    if (typeof obj === "string") {
        const buff = Buffer.from(obj);
        return buffers
            .push(TYPES.STRING)
            .push(buff.byteLength)
            .push(buff);
    }
    if (Array.isArray(obj)) {
        buffers
            .push(TYPES.ARRAY)
            .push(obj.length);
        for (const entry of obj) {
            buffers.push(serialize_impl(entry, references));
        }
        return buffers;
    }
    if (obj instanceof Map) {
        const entries = [...obj];
        buffers
            .push(TYPES.MAP)
            .push(entries.length);
        for (const [key, val] of entries) {
            buffers
                .push(serialize_impl(key, references))
                .push(serialize_impl(val, references));
        }
        return buffers;
    }
    if (obj instanceof Set) {
        const entries = [...obj];
        buffers
            .push(TYPES.SET)
            .push(entries.length);
        for (const val of entries) {
            buffers.push(serialize_impl(val, references));
        }
        return buffers;
    }
    if (ArrayBuffer.isView(obj) || obj instanceof ArrayBuffer) {
        const subtype = getTypedArrayType(obj);
        return buffers
            .push(TYPES.BUFFER)
            .push(subtype)
            .push(obj.byteLength)
            .push(obj);
    }

    // object
    const entries = Object.entries(obj);
    buffers
        .push(TYPES.OBJECT)
        .push(entries.length);
    for (const [key, value] of entries) {
        const buff = Buffer.from(key);
        buffers
            .push(buff.byteLength)
            .push(buff)
            .push(serialize_impl(value, references));
    }
    return buffers;
}

export default serialize;
