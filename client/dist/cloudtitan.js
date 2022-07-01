#!/usr/bin/node

import WebSocket from "ws";
import args from "command-line-args";
import usage from "command-line-usage";
import { readFileSync } from "fs";
import zlib from "zlib";

import { serialize, deserialize } from "./Packager.js";

const options = [{
    name: 'bitstream',
    alias: "b",
    type: String,
    typeLabel: '{underline file}',
    description: "The bitstream to load in the FPGA"
}, {
    name: 'firmware',
    alias: "f",
    type: String,
    typeLabel: '{underline file}',
    description: "The firmware to load in the FPGA"
}, {
    name: 'auth-token',
    alias: 't',
    type: String,
    typeLabel: '{underline token}',
    description: "Your identification token"
}, {
    name: 'help',
    alias: 'h',
    type: Boolean,
    description: "This help message",
}, {
    name: 'host',
    alias: 'H',
    type: String,
    typeLabel: '{underline address}',
    description: "The address of the cloudtitan server",
}, {
    name: 'no-tls',
    type: Boolean,
    description: "Disable TLS in the network connection",
}];

const opts = args(options, { camelCase: true });

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

const stdout = process.stdout;

ws.on("open", () => {
    if (stdout.isTTY) {
        stdout.on("resize", () => send("resize", [stdout.columns, stdout.rows]));
        send("resize", [stdout.columns, stdout.rows]);
    }

    if (opts.bitstream) {
        const bitstream = readFileSync(opts.bitstream);
        send("bitstream", compress(bitstream))
    }
    
    if (opts.firmware) {
        const firmware = readFileSync(opts.firmware);
        send("firmware", compress(firmware))
    }

    send("start");
});
  
ws.on("message", (data) => {
    const msg = deserialize(data);
    stdout.write(msg.value);
});

ws.on("close", (code, reason) => {
    stdout.write("\n");
    if (code !== 1000) {
        console.error(`Connection closed: Error code ${code}: ${reason.toString()}`);
        process.exit(1);
    }
});
