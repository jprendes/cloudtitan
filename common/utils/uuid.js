import { generateKey } from "crypto";

function uuid() {
    return new Promise((ressolve, reject) => {
        generateKey("aes", { length: 256 }, (error, key) => {
            if (error) {
                reject(error);
            } else {
                ressolve(key.export().toString("hex"));
            }
        });
    });
}

export default uuid;
