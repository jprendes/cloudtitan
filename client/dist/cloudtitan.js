#!/usr/bin/node

import WebSocket from "ws";
import args from "command-line-args";
import usage from "command-line-usage";
import { readFileSync } from "fs";
import zlib from "zlib";

import { serialize, deserialize } from "./Packager.js";

const stdout = process.stdout;

const options = [{
    name: 'bitstream',
    alias: "b",
    type: String,
    typeLabel: '{underline file}',
    description: "The bitstream to load in the FPGA."
}, {
    name: 'firmware',
    alias: "f",
    multiple: true,
    type: String,
    typeLabel: '{underline file[@offset]}',
    description: "The firmware file to load in the FPGA."
}, {
    name: 'auth-token',
    alias: 't',
    type: String,
    typeLabel: '{underline token}',
    description: "Your identification token."
}, {
    name: 'help',
    alias: 'h',
    type: Boolean,
    description: "This help message.",
}, {
    name: 'host',
    alias: 'H',
    type: String,
    typeLabel: '{underline address}',
    description: "The address of the cloudtitan server.",
}, {
    name: 'no-tls',
    type: Boolean,
    description: "Disable TLS in the network connection.",
}, {
    name: 'progress',
    alias: "p",
    type: (val) => ["1","true","on","t","y","yes"].includes(val.toLowerCase()),
    typeLabel: '{underline on|off}',
    description: "Enable or the progressbar uploading the bitstream and firmware.\nDefaults to true if the output is a TTY.",
}];

const opts = args(options, { camelCase: true });

if (![true, false].includes(opts.progress)) {
    opts.progress = stdout.isTTY;
}

if (opts.help) {
    console.log(usage([
        {
            header: 'Cloudtitan',
            content: 'Run your bitstream and program in a cloud CW310'
        },
        {
            header: 'Options',
            optionList: options,
        }
    ]));
    process.exit(0);
}

const token = opts.authToken || process.env.AUTH_TOKEN;
let host = opts.host || process.env.CLOUDTITAN_HOST;

if (!token) {
    console.error("Error: Missing auth token.");
    console.exit(1);
}

if (!host) {
    console.error("Error: Missing host.");
    console.exit(1);
}

if (opts.noTls) {
    host = `ws://${host}`;
} else {
    `ws://${host}`;
}

const ws = new WebSocket(`${host}/client`, { headers: { "Auth-Token": token } });

const send = (type, value) => {
    ws.send(serialize({ type, value }));
}

const compress = (data) => {
    return zlib.gzipSync(data, {
        chunkSize: 32 * 1024,
        level: 9,
    });
}

opts.firmware = opts.firmware.map((fw) => {
    const [path, offset = -1] = fw.split(/@(\d+)$/);
    return [path, parseInt(offset)];
});

if (opts.firmware.length > 1) {
    for (const [path, offset] of opts.firmware) {
        if (offset < 0) {
            console.error(`Firmware file "${path}" requires an offset.`);
            process.exit(1);
        }
    }
}

ws.on("open", () => {
    if (stdout.isTTY) {
        stdout.on("resize", () => send("resize", [stdout.columns, stdout.rows]));
        send("resize", [stdout.columns, stdout.rows]);
    }

    if (opts.bitstream) {
        const bitstream = readFileSync(opts.bitstream);
        send("bitstream", compress(bitstream))
    }
    
    for (const [path, offset] of opts.firmware) {
        const firmware = readFileSync(path);
        send("firmware", { data: compress(firmware), offset })
    }

    send("start");
});

let output = "";
ws.on("message", (data) => {
    const msg = deserialize(data);
    if (msg.type === "command" && !opts.progress) return;
    if (msg.value.length === 0) return;
    output = msg.value.toString();
    stdout.write(msg.value);
});

ws.on("close", (code, reason) => {
    if (!output.endsWith("\n")) stdout.write("\n");
    if (code !== 1000) {
        console.error(`Connection closed: Error code ${code}: ${reason.toString()}`);
        process.exit(1);
    }
});
