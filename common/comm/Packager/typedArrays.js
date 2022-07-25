const TypedArrayType = {
    Raw: 0,
    Buffer: 1,
    Int8: 2,
    Uint8: 3,
    Uint8Clamped: 4,
    Int16: 5,
    Uint16: 6,
    Int32: 7,
    Uint32: 8,
    Float32: 9,
    Float64: 10,
    BigInt64: 11,
    BigUint64: 12,
};

function getTypedArrayType(v) {
    if (!ArrayBuffer.isView(v)) {
        return TypedArrayType.Raw;
    }
    if (v instanceof Buffer) {
        return TypedArrayType.Buffer;
    }
    if (v instanceof Int8Array) {
        return TypedArrayType.Int8;
    }
    if (v instanceof Uint8Array) {
        return TypedArrayType.Uint8;
    }
    if (v instanceof Uint8ClampedArray) {
        return TypedArrayType.Uint8Clamped;
    }
    if (v instanceof Int16Array) {
        return TypedArrayType.Int16;
    }
    if (v instanceof Uint16Array) {
        return TypedArrayType.Uint16;
    }
    if (v instanceof Int32Array) {
        return TypedArrayType.Int32;
    }
    if (v instanceof Uint32Array) {
        return TypedArrayType.Uint32;
    }
    if (v instanceof Float32Array) {
        return TypedArrayType.Float32;
    }
    if (v instanceof Float64Array) {
        return TypedArrayType.Float64;
    }
    if (v instanceof BigInt64Array) {
        return TypedArrayType.BigInt64;
    }
    if (v instanceof BigUint64Array) {
        return TypedArrayType.BigUint64;
    }
    throw Error("Unknown ArrayBufferView type");
}

function getTypedViewConstructor(type) {
    switch (type) {
    case TypedArrayType.Raw:
        return (v) => v;
    case TypedArrayType.Buffer:
        return (v) => Buffer.from(v);
    case TypedArrayType.Int8:
        return (v) => new Int8Array(v);
    case TypedArrayType.Uint8:
        return (v) => new Uint8Array(v);
    case TypedArrayType.Uint8Clamped:
        return (v) => new Uint8ClampedArray(v);
    case TypedArrayType.Int16:
        return (v) => new Int16Array(v);
    case TypedArrayType.Uint16:
        return (v) => new Uint16Array(v);
    case TypedArrayType.Int32:
        return (v) => new Int32Array(v);
    case TypedArrayType.Uint32:
        return (v) => new Uint32Array(v);
    case TypedArrayType.Float32:
        return (v) => new Float32Array(v);
    case TypedArrayType.Float64:
        return (v) => new Float64Array(v);
    case TypedArrayType.BigInt64:
        return (v) => new BigInt64Array(v);
    case TypedArrayType.BigUint64:
        return (v) => new BigUint64Array(v);
    default:
        return (v) => v;
    }
}

function toArrayBuffer(b) {
    if (!ArrayBuffer.isView(b)) return b;
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

export {
    toArrayBuffer,
    getTypedArrayType,
    getTypedViewConstructor,
};
