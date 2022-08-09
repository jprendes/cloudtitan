import { toArrayBuffer } from "cloudtitan-common/comm/Packager/typedArrays.js";
import { md5 } from "cloudtitan-common/utils/crypto.js";
import { deserialize, serialize } from "cloudtitan-common/comm/Packager.js";
import base from "base-x";

const BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const base62 = base(BASE62);

function bytesToI32(buff) {
    const [n] = new Uint32Array(toArrayBuffer(buff.subarray(0, 4)));
    return n;
}

function prngBuffer(seed, N) {
    if (seed === 0) seed = 1;

    const M = Math.ceil(N / 4);
    const buff = new Uint32Array(M);

    buff[0] = seed;
    for (let m = 1; m < M; ++m) {
        buff[m] = (buff[m - 1] * 279470273) % 0xfffffffb;
    }
    return Buffer.from(toArrayBuffer(buff)).subarray(0, N);
}

function stringify(data, enc = "base62") {
    data = serialize(data);
    const seed = bytesToI32(md5(data));
    const otp = prngBuffer(seed, data.length);

    for (let i = 0; i < data.length; ++i) {
        // eslint-disable-next-line no-bitwise
        data[i] ^= otp[i];
    }

    const buf = Buffer.concat([otp.subarray(0, 4), data]);
    if (enc === "base62") {
        return base62.encode(buf);
    }
    return buf.toString(enc);
}

function parse(data, enc = "base62") {
    if (enc === "base62") {
        data = Buffer.from(toArrayBuffer(base62.decode(data)));
    } else {
        data = Buffer.from(data, enc);
    }

    const seed = bytesToI32(data);
    const otp = prngBuffer(seed, data.length);

    data = data.subarray(4);

    for (let i = 0; i < data.length; ++i) {
        // eslint-disable-next-line no-bitwise
        data[i] ^= otp[i];
    }

    return deserialize(data);
}

function parseOr(data, orVal, enc = "base62") {
    try {
        return parse(data, enc);
    } catch (err) {
        return orVal;
    }
}

export { stringify, parse, parseOr };
