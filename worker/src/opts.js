import cliArgs from "command-line-args";
import cliUsage from "command-line-usage";

import { DEFAULTS } from "./config.js";

const options = [{
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

    return opts;
}

function usage() {
    console.log(cliUsage([{
        header: "Cloudtitan",
        content: "Expose the local CW310 to the cloud",
    }, {
        header: "Options",
        optionList: options,
    }]));
}

export { parse, usage };
