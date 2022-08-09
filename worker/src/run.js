import { Agent } from "https";

import fetch from "node-fetch";

import { deserialize } from "cloudtitan-common/comm/Packager.js";
import Socket from "cloudtitan-common/comm/Socket.js";

import Session from "./session/Session.js";
import { stderr, write } from "./write.js";

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
            write(stderr, "\x1b[1;33m> ", "Running session ", JSON.stringify(id), "\r\n\x1b[0m");

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
            write(stderr, "\x1b[1;33m< ", "Done ", JSON.stringify(id), "\r\n\x1b[0m");
        } catch (err) {
            write(stderr, "\x1b[1;31m> ", "Error: ", err?.message, "\r\n\x1b[0m");
        } finally {
            if (!chann.closed) chann.close();
        }
    });

    const [code, reason] = await done;
    if (code !== 1000) {
        write(stderr, "\x1b[1;31mConnection closed: ", reason || `code ${code}`, "\r\n\x1b[0m");
    }
};
