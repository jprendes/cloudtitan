import Evented from "cloudtitan-common/events/Evented.js";
import Socket from "cloudtitan-common/comm/Socket.js";
import {
    stdout, stderr, COLORS, TRANSFORMS,
} from "./write.js";

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

    emitter.on("console", (_, chunk) => stdout.print(chunk));
    emitter.on("prompt", (_, chunk) => stderr.color(COLORS.GREEN).bold().println("> ", chunk));
    emitter.on("command", (_, chunk) => stderr.color(COLORS.CYAN).transform(TRANSFORMS.progressBar).print(chunk));
    emitter.on("error", (_, chunk) => stderr.color(COLORS.RED).bold().println("> ", chunk));
    emitter.on("queued", (pos, workers) => stderr.color(COLORS.YELLOW).bold().print("> ", queuedMsg(pos, workers), "\r"));
    emitter.on("delete", () => stderr.color(COLORS.RED).bold().println("> Session removed"));

    const [code, reason] = await sock.once("close");
    if (code !== 1000) {
        stderr.color(COLORS.RED).bold().println(`> Connection closed: ${reason || `code ${code}`}`);
    }
};
