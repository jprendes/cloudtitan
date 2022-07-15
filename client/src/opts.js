import cliArgs from "command-line-args";
import cliUsage from "command-line-usage";

import { DEFAULTS } from "./config.js";

const options = [{
    name: "bitstream",
    alias: "b",
    type: String,
    typeLabel: "{underline file}",
    description: "The bitstream to load in the FPGA.",
    defaultValue: DEFAULTS.bitstream,
}, {
    name: "firmware",
    alias: "f",
    multiple: true,
    type: String,
    typeLabel: "{underline file[@offset]}",
    description: "The firmware file to load in the FPGA.",
    defaultValue: DEFAULTS.firmware,
}, {
    name: "timeout",
    alias: "t",
    type: Number,
    typeLabel: "{underline seconds}",
    description: "Stop session after [seconds] without activity.",
    defaultValue: 2,
    defaultValue: DEFAULTS.timeout,
}, {
    name: "host",
    alias: "H",
    type: String,
    typeLabel: "{underline address}",
    description: "The address of the cloudtitan server.",
    defaultValue: process.env.CLOUDTITAN_HOST || DEFAULTS.host,
}, {
    name: "auth-token",
    alias: "a",
    type: String,
    typeLabel: "{underline token}",
    description: "Your identification token.",
    defaultValue: process.env.CLOUDTITAN_AUTH_TOKEN || DEFAULTS.authToken,
}, {
    name: "help",
    alias: "h",
    type: Boolean,
    description: "This help message.",
}, {
    name: "no-tls",
    type: Boolean,
    description: "Disable TLS in the network connection.",
    defaultValue: DEFAULTS.noTls,
}, {
    name: "self-signed",
    type: Boolean,
    description: "Accept self signed certificates from TLS servers.",
    defaultValue: DEFAULTS.selfSigned,
}];

function parse() {
    const opts = cliArgs(options, { camelCase: true });

    if (opts.help) return opts;

    if (!opts.authToken) {
        throw new Error("Missing auth token");
    }
    
    if (!opts.host) {
        throw new Error("Missing host");
    }

    if (opts.noTls) {
        opts.host = opts.host && `ws://${opts.host}`;
    } else {
        opts.host = opts.host && `wss://${opts.host}`;
    }

    opts.firmware = (opts.firmware || []).map((fw) => {
        const [path, offset = -1] = fw.split(/@(\d+)$/);
        if (offset === -1) {
            return [path];
        }
        return [path, parseInt(offset, 10)];
    });

    if (opts.firmware.length > 1) {
        for (const [path, offset] of opts.firmware) {
            if (offset < 0) {
                throw new Error(`Firmware file "${path}" requires an offset.`);
            }
        }
    }

    if (opts.timeout === null || isNaN(opts.timeout) || opts.timeout <= 0) {
        throw new Error("Timeout must be a positive integer");
    }
    
    if (opts.timeout > Number.MAX_SAFE_INTEGER) {
        throw new Error(`Timeout must be smaller than ${Number.MAX_SAFE_INTEGER}`);
    }
    
    opts.timeout = Math.round(opts.timeout);

    return opts;
}

function usage() {
    console.log(cliUsage([{
        header: "Cloudtitan",
        content: "Run your bitstream and programs in a cloud CW310",
    }, {
        header: "Options",
        optionList: options,
    }]));
}

export { parse, usage };
