import { Agent } from "https";

import fetch from "node-fetch";

import term from "cloudtitan-common/utils/Term.js";

import { list, find, ensureCache } from "./session.js";

export default async (sessions, { all, ...opts }) => {
    const {
        tls, selfSigned, authToken,
    } = opts;
    let { host } = opts;

    if (tls) {
        host = `s://${host}`;
    } else {
        host = `://${host}`;
    }

    await ensureCache(opts);

    if (all) {
        sessions = (await list(opts)).map(([id]) => id);
    }

    const success = await Promise.all(sessions.map(async (id) => {
        try {
            id = await find(id, opts);
            const res = await fetch(`http${host}/session/remove/${id}`, {
                headers: { "Auth-Token": authToken },
                agent: new Agent({ rejectUnauthorized: !selfSigned }),
            });
            return res.status === 200;
        } catch (err) {
            return false;
        }
    }));

    const ok = sessions.filter((s, i) => success[i]);
    const failed = sessions.filter((s, i) => !success[i]);

    term.yellow.bold.errorln(`Removed ${ok.length} sessions.`);
    if (failed.length) {
        term.red.bold.errorln("Failed to remove the following sessions:");
        failed.forEach((session, i) => {
            term.red.errorln(`  ${i + 1}. ${session}`);
        });
    }
};
