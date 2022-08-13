import { Agent } from "https";

import fetch from "node-fetch";

import { deserialize } from "cloudtitan-common/comm/Packager.js";
import Socket from "cloudtitan-common/comm/Socket.js";
import term from "cloudtitan-common/utils/Term.js";

import Session from "./session/Session.js";

export default async ({ sessionId, demo, ...opts }) => {
    const {
        tls, selfSigned, authToken,
    } = opts;
    let { host } = opts;

    if (tls) {
        host = `s://${host}`;
    } else {
        host = `://${host}`;
    }

    let url = `ws${host}/worker`;
    if (demo) url = `${url}/demo`;

    const sock = await Socket.connect(url, {
        headers: { "Auth-Token": authToken },
        rejectUnauthorized: !selfSigned,
        // set a watchdog timeout higher than the server's 30s
        timeout: 60e3,
    });

    const done = sock.once("close");

    sock.on("channel", async (id, chann) => {
        try {
            term.yellow.bold.errorln("> Running session ", JSON.stringify(id));

            const res = await fetch(`http${host}/session/dl/${id}`, {
                headers: { "Auth-Token": authToken },
                agent: new Agent({ rejectUnauthorized: !selfSigned }),
            });

            const buff = Buffer.from(await res.arrayBuffer());
            const { binaries, commands, timeout } = deserialize(buff);

            let session = null;
            if (demo) {
                session = new Session.Demo();
            } else {
                session = new Session();
            }

            session.on(["console", "command", "prompt", "error", "done"], (evt, ...args) => {
                if (chann.closed) return;
                chann.send(evt, ...args);
            });

            chann.on("close", () => session.kill());

            await session.ready();
            await session.start(binaries, commands, timeout);

            term.yellow.bold.errorln("< Done: ", JSON.stringify(id));
        } catch (err) {
            term.red.bold.errorln("> Error: ", err?.message);
        } finally {
            if (!chann.closed) chann.close();
        }
    });

    const [code, reason] = await done;
    if (code !== 1000) {
        term.red.bold.errorln("Connection closed: ", reason || `code ${code}`);
    }
};
