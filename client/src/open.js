import Evented from "cloudtitan-common/events/Evented.js";
import Socket from "cloudtitan-common/comm/Socket.js";
import term from "cloudtitan-common/utils/Term.js";
import * as ProgressBar from "cloudtitan-common/utils/ProgressBar.js";

import { find } from "./session.js";

export default async (session, opts) => {
    const {
        tls, selfSigned, authToken,
    } = opts;
    let { host } = opts;

    if (tls) {
        host = `s://${host}`;
    } else {
        host = `://${host}`;
    }

    session = await find(session, opts);

    const sock = await Socket.connect(`ws${host}/session/open/${session}`, {
        headers: { "Auth-Token": authToken },
        rejectUnauthorized: !selfSigned,
        // set a watchdog timeout higher than the server's 30s
        timeout: 60e3,
    });

    const emitter = new Evented();
    sock.on("message", (...args) => emitter.emit(...args));

    const queuedMsg = (pos, workers) => `Session queued. Position ${pos} (${workers} worker${workers === 1 ? "" : "s"})`;

    // emitter.on("console", (_, chunk) => stdout.print(chunk));
    emitter.on("console", (_, chunk) => term.log(chunk));
    emitter.on("prompt", (_, chunk) => term.green.bold.errorln("> ", chunk));
    emitter.on("command", (_, chunk) => term.cyan.map(ProgressBar.unzip).error(chunk));
    emitter.on("error", (_, chunk) => term.red.bold.errorln("> ", chunk));
    emitter.on("queued", (pos, workers) => pos && term.yellow.bold.errorln("> ", queuedMsg(pos, workers), "\r"));
    emitter.on("delete", () => term.red.bold.errorln("> Session removed"));

    const [code, reason] = await sock.once("close");
    if (code !== 1000) {
        term.red.bold.errorln("> Connection closed: ", reason || `code ${code}`);
    }
};
