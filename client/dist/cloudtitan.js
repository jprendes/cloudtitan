#!/usr/bin/node

import WebSocket from "ws";
import args from "command-line-args";
import usage from "command-line-usage";
import { readFileSync } from "fs";
import zlib from "zlib";

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

if (!host.startsWith("ws:") && !host.startsWith("wss:")) {
    host = `wss://${host}`;
}

const ws = new WebSocket(`${host}/ws`, { headers: { "Auth-Token": token } });

const compress = (data) => {
    return zlib.gzipSync(data, {
        chunkSize: 32 * 1024,
        level: 9,
    });
}

ws.on("open", () => {
    if (opts.bitstream) {
        const bitstream = readFileSync(opts.bitstream);
        ws.send(Buffer.concat([Buffer.from("b"), compress(bitstream)]));
    }
    
    if (opts.firmware) {
        const firmware = readFileSync(opts.firmware);
        ws.send(Buffer.concat([Buffer.from("f"), compress(firmware)]));
    }

    ws.send("start");
});
  
ws.on("message", (data) => {
    process.stdout.write(data)
});

ws.on("close", (code, reason) => {
    if (code !== 1000) {
        console.error(`Connection closed: Error code ${code}: ${reason.toString()}`);
        process.exit(1);
    }
});
