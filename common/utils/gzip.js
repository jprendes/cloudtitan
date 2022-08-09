import { gunzip, gzip } from "zlib";

function decompress(data) {
    return new Promise((resolve, reject) => {
        gunzip(data, (err, result) => {
            if (err) reject(err);
            resolve(result);
        });
    });
}

function compress(data) {
    return new Promise((resolve, reject) => gzip(data, {
        chunkSize: 32 * 1024,
    }, (error, result) => {
        if (error) {
            reject(error);
        } else {
            resolve(result);
        }
    }));
}

export { compress, decompress };
