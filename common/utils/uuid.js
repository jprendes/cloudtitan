import { generateKey } from "./crypto.js";

async function uuid() {
    const key = await generateKey(256);
    return key.toString("binary");
}

export default uuid;
