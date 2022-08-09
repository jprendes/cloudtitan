import crypto from "crypto";

import { serialize, deserialize } from "../comm/Packager.js";

function randomBytes(n) {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(n, (error, buff) => {
            if (error) {
                reject(error);
            } else {
                resolve(buff);
            }
        });
    });
}

function generateKey(length = 256) {
    return new Promise((ressolve, reject) => {
        crypto.generateKey("aes", { length }, (error, key) => {
            if (error) {
                reject(error);
            } else {
                ressolve(key.export());
            }
        });
    });
}

function md5(obj) {
    return crypto.createHash("md5").update(serialize(obj)).digest();
}

async function encrypt(key, plain) {
    const iv = await randomBytes(16);
    return serialize([iv, await encryptIv(key, iv, plain)]).subarray(5);
}

async function encryptIv(key, iv, plain) {
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key), md5(iv));
    const encrypted = cipher.update(serialize(plain));
    return Buffer.concat([encrypted, cipher.final()]);
}

async function decrypt(key, data) {
    const [iv, encrypted] = deserialize(Buffer.concat([Buffer.from("a\x02b\x01\x10"), data]));
    return decryptIv(key, iv, encrypted);
}

async function decryptIv(key, iv, encrypted) {
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key), md5(iv));
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return deserialize(decrypted);
}

export {
    randomBytes,
    generateKey,
    encrypt,
    decrypt,
    encryptIv,
    decryptIv,
    md5,
};
