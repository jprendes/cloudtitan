/* eslint-disable camelcase */
import { signed, unsigned } from "leb128";

import {
    toArrayBuffer,
    getTypedArrayType,
    getTypedViewConstructor,
} from "./typedArrayUtils.js";

function toBuffer(obj) {
    return Buffer.from(toArrayBuffer(obj));
}

function serialize(obj) {
    return serialize_any(obj, new Set());
}

function makeSized(buffer) {
    buffer = toBuffer(buffer);
    return Buffer.concat([
        unsigned.encode(buffer.byteLength),
        Buffer.from(buffer),
    ]);
}

const TYPES = {
    INTEGER: "i",
    NUMBER: "n",
    STRING: "s",
    TRUE: "t",
    FALSE: "f",
    UNDEFINED: "u",
    NULL: "N",
    ARRAY: "a",
    MAP: "M",
    SET: "S",
    BUFFER: "b",
    OBJECT: "o",
};

function serialize_any(obj, visited) {
    const buffers = [];
    if (typeof obj === "number") {
        // eslint-disable-next-line no-bitwise
        if ((obj | 0) === obj) {
            buffers.push(Buffer.from(TYPES.INTEGER));
            buffers.push(signed.encode(obj));
        } else {
            buffers.push(Buffer.from(TYPES.NUMBER));
            buffers.push(toBuffer(Float64Array.from([obj])));
        }
    } else if (typeof obj === "string") {
        buffers.push(Buffer.from(TYPES.STRING));
        buffers.push(makeSized(Buffer.from(obj)));
    } else if (typeof obj === "boolean") {
        buffers.push(obj ? Buffer.from(TYPES.TRUE) : Buffer.from(TYPES.FALSE));
    } else if (typeof obj === "undefined") {
        buffers.push(Buffer.from(TYPES.UNDEFINED));
    } else if (!obj) { // null
        buffers.push(Buffer.from(TYPES.NULL));
    } else if (Array.isArray(obj)) {
        buffers.push(Buffer.from(TYPES.ARRAY));
        buffers.push(serialize_arr(obj, visited));
    } else if (obj instanceof Map) {
        buffers.push(Buffer.from(TYPES.MAP));
        buffers.push(serialize_arr([...obj], visited));
    } else if (obj instanceof Set) {
        buffers.push(Buffer.from(TYPES.SET));
        buffers.push(serialize_arr([...obj], visited));
    } else if (ArrayBuffer.isView(obj) || obj instanceof ArrayBuffer) {
        buffers.push(Buffer.from(TYPES.BUFFER));
        buffers.push(unsigned.encode(getTypedArrayType(obj)));
        buffers.push(makeSized(obj));
    } else { // object
        const buff = serialize_obj(obj, visited);
        buffers.push(Buffer.from(TYPES.OBJECT));
        buffers.push(buff);
    }

    return Buffer.concat(buffers);
}

function serialize_arr(arr, visited) {
    if (visited.has(arr)) {
        throw new Error("Trying to serialize a cyclic entry");
    }
    visited.add(arr);
    const buffers = [];
    buffers.push(unsigned.encode(arr.length));
    for (const entry of arr) {
        buffers.push(serialize_any(entry, visited));
    }
    return Buffer.concat(buffers);
}

function serialize_obj(obj, visited) {
    if (visited.has(obj)) {
        throw new Error("Trying to serialize a cyclic entry");
    }
    visited.add(obj);
    const buffers = [];
    const entries = Object.entries(obj);
    buffers.push(unsigned.encode(entries.length));
    for (const [key, value] of entries) {
        buffers.push(makeSized(Buffer.from(key)));
        buffers.push(serialize_any(value, visited));
    }
    return Buffer.concat(buffers);
}

function deserialize_uleb(buffer) {
    const l = parseInt(unsigned.decode(buffer), 10);
    // eslint-disable-next-line no-bitwise
    while (buffer[0] & 0x80) buffer = buffer.slice(1);
    buffer = buffer.slice(1);
    return [l, buffer];
}

function deserialize_ileb(buffer) {
    const l = parseInt(signed.decode(buffer), 10);
    // eslint-disable-next-line no-bitwise
    while (buffer[0] & 0x80) buffer = buffer.slice(1);
    buffer = buffer.slice(1);
    return [l, buffer];
}

function deserialize(buffer) {
    const [result, b] = deserialize_any(buffer);
    if (b.length > 0) throw new Error("Invalid serialized value");
    return result;
}

function deserialize_any(buffer) {
    const tag = buffer.slice(0, 1).toString();
    const buff = buffer.slice(1);
    switch (tag) {
    case TYPES.INTEGER: {
        return deserialize_ileb(buff);
    }
    case TYPES.NUMBER: {
        return [
            new Float64Array(buff.buffer.slice(buff.byteOffset, buff.byteOffset + 8))[0],
            buff.slice(8),
        ];
    }
    case TYPES.STRING: {
        const [l, b] = deserialize_uleb(buff);
        return [
            b.slice(0, l).toString(),
            b.slice(l),
        ];
    }
    case TYPES.TRUE: {
        return [true, buff];
    }
    case TYPES.FALSE: {
        return [false, buff];
    }
    case TYPES.UNDEFINED: {
        return [undefined, buff];
    }
    case TYPES.NULL: {
        return [null, buff];
    }
    case TYPES.ARRAY: {
        return deserialize_arr(buff);
    }
    case TYPES.MAP: {
        const [arr, b] = deserialize_arr(buff);
        return [new Map(arr), b];
    }
    case TYPES.SET: {
        const [arr, b] = deserialize_arr(buff);
        return [new Set(arr), b];
    }
    case TYPES.BUFFER: {
        const [t, b] = deserialize_uleb(buff);
        const [l, bb] = deserialize_uleb(b);
        return [
            getTypedViewConstructor(t)(toArrayBuffer(bb.slice(0, l))),
            bb.slice(l),
        ];
    }
    case TYPES.OBJECT: {
        return deserialize_obj(buff);
    }
    default: {
        throw new Error("Invalid serialized value");
    }
    }
}

function deserialize_arr(buffer) {
    const [l, buff] = deserialize_uleb(buffer);
    const result = [];
    let b = buff;
    for (let i = 0; i < l; ++i) {
        let val;
        [val, b] = deserialize_any(b);
        result.push(val);
    }
    return [result, b];
}

function deserialize_obj(buffer) {
    const [l, buff] = deserialize_uleb(buffer);
    const result = {};
    let b = buff;
    for (let i = 0; i < l; ++i) {
        let k_l;
        let val;
        [k_l, b] = deserialize_uleb(b);
        const key = b.slice(0, k_l).toString();
        [val, b] = deserialize_any(b.slice(k_l));
        result[key] = val;
    }
    return [result, b];
}

export { deserialize, serialize };
