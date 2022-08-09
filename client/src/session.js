import { Agent } from "https";

import fetch from "node-fetch";

let cache = null;

async function list(opts) {
    const {
        tls, selfSigned, authToken,
    } = opts;
    let { host } = opts;

    if (tls) {
        host = `s://${host}`;
    } else {
        host = `://${host}`;
    }

    const res = await fetch(`http${host}/session/list`, {
        headers: { "Auth-Token": authToken },
        agent: new Agent({ rejectUnauthorized: !selfSigned }),
    });

    if (res.status !== 200) {
        throw new Error("Can't resolve sessions.");
    }

    return res.json();
}

async function ensureCache(opts) {
    if (!cache) {
        cache = await list(opts);
    }
}

async function find(id, opts) {
    if (id.endsWith("…") || id.length < 99 || id.length >= 3) {
        if (id.endsWith("…")) id = id.slice(0, -1);
        try {
            await ensureCache(opts);
            const sessions = cache.slice().filter(([s]) => s.startsWith(id));
            if (sessions.length === 1) return sessions[0][0];
        } catch (err) {
            // no-op
        }
    }
    return id;
}

function unique(v) {
    return [...new Set(v)];
}

function trim(v, w) {
    return v.map((id) => id.slice(0, w));
}

async function reduce(ids, opts) {
    await ensureCache(opts);
    const sessions = await list(opts);
    const existing = sessions.map(([id]) => id);
    const all = unique([...ids, ...existing]);
    const maxWidth = Math.max(...all.map((id) => id.length));
    for (let width = 8; width < maxWidth; width++) {
        if (all.length === unique(trim(all, width)).length) {
            return trim(ids, width);
        }
    }
    return ids;
}

// eslint-disable-next-line import/prefer-default-export
export {
    list, find, ensureCache, reduce,
};
