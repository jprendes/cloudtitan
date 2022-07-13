#!/usr/bin/node

import Socket from "cloudtitan-common/comm/Socket.js";
import { IpcHost } from "cloudtitan-common/comm/Ipc.js";

import { parse, usage } from "./opts.js";
import Session from "./session/Session.js";

process.on("unhandledRejection", (error) => {
    console.error("Unhandled Promise Rejection", error);
});

let opts = null;
try {
    opts = parse();
} catch (err) {
    console.error(err.message);
    process.exit(1);
}

if (opts.help) {
    usage();
    process.exit(0);
}

if (!opts.authToken) {
    console.error("Error: Missing auth token.");
    process.exit(1);
}

if (!opts.host) {
    console.error("Error: Missing host.");
    process.exit(1);
}

const sock = await Socket.connect(`${opts.host}/worker`, {
    headers: { "Auth-Token": opts.authToken },
    rejectUnauthorized: !opts.selfSigned,
});

sock.on("channel", (name, channel) => {
    const session = new Session();
    // eslint-disable-next-line no-new
    new IpcHost(channel, session);
});
