import { unsigned } from "leb128";

function serialize(obj) {
    return serialize_any(obj, new Set());
}

function makeSized(buffer) {
    return Buffer.concat([
        unsigned.encode(buffer.byteLength),
        Buffer.from(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)),
    ]);
}

function serialize_any(obj, visited) {
    const buffers = [];
    if (typeof obj === "number") {
        buffers.push(Buffer.from("n"));
        buffers.push(Buffer.from(Float64Array.from([obj]).buffer));
    } else if (typeof obj === "string") {
        buffers.push(Buffer.from("s"));
        buffers.push(makeSized(Buffer.from(obj)))
    } else if (typeof obj === "boolean") {
        buffers.push(obj ? Buffer.from("t") : Buffer.from("f"));
    } else if (!obj) { // null or undefined
        buffers.push(Buffer.from("u"));
    } else if (Array.isArray(obj)) {
        const buff = serialize_arr(obj, visited);
        buffers.push(Buffer.from("a"));
        buffers.push(buff);
    } else if (obj.buffer instanceof ArrayBuffer) {
        buffers.push(Buffer.from("b"));
        buffers.push(makeSized(obj));
    } else { // object
        const buff = serialize_obj(obj, visited);
        buffers.push(Buffer.from("o"));
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
        buffers.push(makeSized(Buffer.from(key)))
        buffers.push(serialize_any(value, visited));
    }
    return Buffer.concat(buffers);
}

function deserialize_leb(buffer) {
    const l = unsigned.decode(buffer);
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
    const tag = buffer.slice(0,1).toString();
    const buff = buffer.slice(1);
    switch (tag) {
    case "n": {
        return [
            new Float64Array(buff.buffer.slice(buff.byteOffset, buff.byteOffset + 8))[0],
            buff.slice(8),
        ];
    }
    case "s": {
        const [l, b] = deserialize_leb(buff);
        return [
            b.slice(0,l).toString(),
            b.slice(l),
        ];
    }
    case "t": {
        return [true, buff];
    }
    case "f": {
        return [false, buff];
    }
    case "u": {
        return [null, buff];
    }
    case "a": {
        return deserialize_arr(buff);
    }
    case "b": {
        const [l, b] = deserialize_leb(buff);
        return [
            b.slice(0,l),
            b.slice(l),
        ];
    }
    case "o": {
        return deserialize_obj(buff);
    }
    default: {
        throw new Error("Invalid serialized value");
    }
    }
}

function deserialize_arr(buffer) {
    const [l, buff] = deserialize_leb(buffer);
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
    const [l, buff] = deserialize_leb(buffer);
    const result = {};
    let b = buff;
    for (let i = 0; i < l; ++i) {
        let key, k_l, val;
        [k_l, b] = deserialize_leb(b);
        key = b.slice(0,k_l).toString();
        [val, b] = deserialize_any(b.slice(k_l));
        result[key] = val;
    }
    return [result, b];
}

export { deserialize, serialize };
