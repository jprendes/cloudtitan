#!/usr/bin/node

import { readFile } from "fs/promises";
import zlib from "zlib";

import Evented from "cloudtitan-common/events/Evented.js";
import Socket from "cloudtitan-common/comm/Socket.js";
import { IpcClient } from "cloudtitan-common/comm/Ipc.js";

import { basename } from "path";
import { parse, usage } from "./opts.js";

process.on("unhandledRejection", (error) => {
    console.error("Unhandled Promise Rejection", error);
});

const duration = (t) => {
    t = Math.max(0, Math.round(t));
    const units = ["s", "m", "h", "d"];
    const mults = [60, 60, 24, Infinity];

    if (t === 0) return "0s";

    const parts = [];
    while (t > 0 && units.length > 0) {
        const unit = units.shift();
        const mult = mults.shift();
        const part = t % mult;
        t = (t - part) / mult;
        parts.unshift(`${part}${unit}`);
    }

    return parts.join(" ");
};

const { stdout, stderr } = process;

let opts = null;
try {
    opts = parse();
} catch (err) {
    console.error(`Error: ${err.message}`);
    console.error(`Run \`${basename(process.argv[0])} --help\` for help`);
    process.exit(1);
}

if (opts.help) {
    usage();
    process.exit(0);
}

const compress = (data) => new Promise((resolve, reject) => zlib.gzip(data, {
    chunkSize: 32 * 1024,
    // level: 9,
}, (error, result) => {
    if (error) {
        reject(error);
    } else {
        resolve(result);
    }
}));

function write(f, ...data) {
    const buff = Buffer.concat([...data.map((chunk) => Buffer.from(chunk))]);
    const str = buff.toString().replace(/\[█×(\d+),░×(\d+),_×(\d+)\]/g, (_, done, todo, width) => {
        width = parseInt(width, 10);
        done = parseInt(done, 10);
        todo = parseInt(todo, 10);
        const progress = done / (done + todo);
        const available = Math.max(1, stdout.columns - width + done + todo);
        done = Math.round(available * progress);
        todo = available - done;
        return `[${Array(done).fill("█").join("")}${Array(todo).fill("░").join("")}]`;
    });
    f.write(str);
}

const sock = await Socket.connect(`${opts.host}/client`, {
    headers: { "Auth-Token": opts.authToken },
    rejectUnauthorized: !opts.selfSigned,
    // set a watchdog timeout higher than the server's 30s
    timeout: 60e3,
});

const api = new IpcClient(sock).proxy();

let printedStatus = false;
function printStatus(status) {
    if (printedStatus) {
        // Remove previous queue message
        write(stderr, "\x1B[A\x1B[2K\r");
    }
    printedStatus = true;
    write(stderr, "\x1b[1;33m> ", status, "\x1b[0m\r\n");
}

api.on("console", (chunk) => write(stdout, chunk));
api.on("prompt", (chunk) => write(stderr, "\x1b[1;32m> ", chunk, "\r\n\x1b[0m"));
api.on("command", (chunk) => write(stderr, "\x1b[32m", chunk, "\x1b[0m"));
api.on("error", (chunk) => write(stderr, "\x1b[1;31m> ", chunk, "\r\n\x1b[0m"));

const binaries = await api.binaries;

const emitter = new Evented();
let compressedBinaries = 0;
let uploadedBinaries = 0;
let totalBinaries = 0;

async function upload(path) {
    totalBinaries += 1;
    emitter.emit("binaries", compressedBinaries, uploadedBinaries, totalBinaries);
    const data = await compress(await readFile(path));
    compressedBinaries += 1;
    emitter.emit("binaries", compressedBinaries, uploadedBinaries, totalBinaries);
    const remotePath = await api.upload(path, data);
    uploadedBinaries += 1;
    emitter.emit("binaries", compressedBinaries, uploadedBinaries, totalBinaries);
    return remotePath;
}

let bitstream = binaries[0];
if (opts.bitstream) {
    bitstream = upload(opts.bitstream);
}

let firmware = [];
for (const [path, ...rest] of opts.firmware) {
    const file = upload(path);
    firmware.push([file, ...rest]);
}

if (firmware.length === 0) {
    firmware.push([binaries[1]]);
}

firmware = Promise.all(firmware.map(async (parts) => {
    parts = await Promise.all(parts);
    return parts.join("@");
}));

emitter.on("binaries", (compressed, uploaded, total) => {
    if (total === 0) return;
    let status = "";
    if (total === 1) {
        status = `Uploading ${total} Binary: `;
        if (compressed === 0) {
            status += "Compressing";
        } else if (uploaded === 0) {
            status += "Uploading";
        } else {
            status += "Done";
        }
    } else {
        status = `Uploading ${total} Binaries: `;
        const substatus = [];
        if (total - compressed > 0) {
            substatus.push(`Compressing ${total - compressed}`);
        }
        if (compressed - uploaded > 0) {
            substatus.push(`Uploading ${compressed - uploaded}`);
        }
        if (uploaded > 0) {
            substatus.push(`Done ${uploaded}`);
        }
        status += substatus.join(", ");
    }
    printStatus(status);
});

api.commands = [
    ["load-bitstream", await bitstream],
    ["console", "2"],
    ["bootstrap", ...await firmware],
    ["console", opts.timeout.toString(10)],
];

let queuedTime = new Date();
api.on("queued", (position, workers) => printStatus(`Job Queued: Position ${position}, ${workers} Workers`));
api.on("started", () => {
    const waitingTime = (new Date() - queuedTime) / 1000;
    printStatus(`Job Started: Queueing time was ${duration(waitingTime)}`);
    printedStatus = false;
    queuedTime = new Date();
});

await api.queue();
