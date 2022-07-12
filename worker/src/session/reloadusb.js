import { watch, access } from "fs/promises";
import { parse } from "path";

import Process from "../utils/Process.js";

async function exists(path) {
    try {
        await access(path);
        return true;
    } catch (e) {
        return false;
    }
}

async function watchFileExists(path, timeout = 10e3) {
    const { dir, base } = parse(path);
    const ac = new AbortController();
    const { signal } = ac;
    setTimeout(() => ac.abort(), timeout);
    const watcher = watch(dir, { signal });
    for await (const { filename } of watcher) {
        if (filename === base) {
            if (await exists(path)) {
                ac.abort();
                return true;
            }
        }
    }
    return false;
}

async function reloadusb() {
    const watchers = Promise.all([
        watchFileExists("/dev/ttyACM0"),
        watchFileExists("/dev/ttyACM1"),
    ]);
    await new Process("cloudtitan-reloadusb").wait();
    await watchers;
}

export default reloadusb;
