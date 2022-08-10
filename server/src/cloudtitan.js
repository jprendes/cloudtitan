#!/usr/bin/node

import { basename } from "path";

import Socket from "cloudtitan-common/comm/Socket.js";

import { deserialize, serialize } from "cloudtitan-common/comm/Packager.js";
import Evented from "cloudtitan-common/events/Evented.js";
import HttpServer from "./HttpServer.js";

import opts from "./main.js";

import Channel from "./utils/Channel.js";
import Static from "./Static.js";
import Proxy from "./Proxy.js";
import Auth from "./auth/Auth.js";
import User from "./auth/User.js";
import * as cookie from "./utils/cookie.js";
import Worker from "./session/Worker.js";
import Session from "./session/Session.js";
import sendJSON from "./utils/sendJSON.js";
import * as tkn from "./utils/token.js";

import database from "./DB.js";

process.on("unhandledRejection", (error) => {
    console.error("Unhandled Promise Rejection", error);
});

const auth = new Auth();

const queue = new Channel();

const jobs = await database.get("queue") || [];
console.log("Restoring queued sessions:");
if (jobs.length === 0) {
    console.log("  No sessions to restore");
} else {
    for (const id of jobs) {
        // eslint-disable-next-line no-await-in-loop
        const session = await Session.byId(id);
        if (!session) continue;
        if (![Session.STATUS.RUNNING, Session.STATUS.PENDING].includes(session.status)) continue;
        if (!session.owner) continue;
        // eslint-disable-next-line no-await-in-loop
        const owner = await User.byId(session.owner);
        if (!owner) continue;
        const token = tkn.stringify([owner.id, session.id]);
        console.log(`  * ${token.slice(0, 8)} (${owner.email})`);
        session.status = Session.STATUS.PENDING;
        queue.push(session);
    }
}
console.log("");

queue.on(["work", "task", "tick"], () => {
    const running = queue.running.map(({ id }) => id);
    const pending = queue.pending.map(({ id }) => id);
    database.set("queue", [...new Set([...running, ...pending])]);
});

function staticOrProxy(uri) {
    if (uri.startsWith("file://")) return Static.fromRoot(uri.slice(7));
    return Proxy.fromUrl(uri);
}

const ui = staticOrProxy(opts.ui);
const dl = staticOrProxy(opts.downloads);

const server = new HttpServer({
    https: opts.tls,
    logError: console.error,
});

server.http("/session/list", async (req, res) => {
    let [user] = await auth.token(req);
    if (!user) {
        [user] = await auth.login(req);
    }
    if (!user) return server.serve("error/403", req, res);

    const sessions = Promise.all([...user.sessions.keys()]
        .map(async (tok) => {
            const session = await Session.byId(tok);
            return [
                tkn.stringify([user.id, tok]),
                {
                    status: session.status,
                    creationDate: session.creationDate,
                },
            ];
        }));

    return sendJSON(res, await sessions);
});

server.http("~/session/remove/:token", async (req, res, { token }) => {
    const [user] = await auth.token(req);
    if (!user) return server.serve("error/403", req, res);

    const [uid, id] = tkn.parseOr(token, [null]);
    if (uid !== user.id) return server.serve("error/403", req, res);
    if (!user.sessions.has(id)) return server.serve("error/403", req, res);

    const session = await Session.byId(id);

    queue.remove(session);
    await user.sessions.delete(id);

    if (!session) return;
    await session.delete();
    await session.save();

    return sendJSON(res, { success: true });
});

server.http("/session/new", async (req, res) => {
    const [user] = await auth.token(req);
    if (!user) return server.serve("error/403", req, res);

    const chunks = [];
    for await (const chunk of req) {
        chunks.push(Buffer.from(chunk));
    }
    const [bins, cmds] = deserialize(Buffer.concat(chunks));

    const binaries = new Map();
    if (!(binaries instanceof Map)) return server.serve("error/400", req, res);
    for (const [path, data] of bins.entries()) {
        if (typeof path !== "string") return server.serve("error/400", req, res);
        if (!(data instanceof Buffer)) return server.serve("error/400", req, res);
        binaries.set(`/working/${basename(path)}`, Buffer.from(data));
    }

    const commands = [];
    if (!(cmds instanceof Array)) return server.serve("error/400", req, res);
    for (const cmd of cmds) {
        if (!(cmd instanceof Array)) return server.serve("error/400", req, res);
        if (!cmd.every((s) => typeof s === "string")) return server.serve("error/400", req, res);
        commands.push(cmd);
    }

    const session = await Session.new({
        binaries,
        commands,
        owner: user.id,
    });

    queue.push(session);

    user.sessions.add(session.id);
    const token = tkn.stringify([user.id, session.id]);

    console.log(`Queued session for ${user.email}`);

    return sendJSON(res, { id: token });
});

server.ws("~/session/open/:token", async (conn, req, { token }) => {
    const [user] = await auth.token(req);
    if (!user) return conn.close(1008, "Unauthorized");

    const [uid, id] = tkn.parseOr(token, [null]);
    if (uid !== user.id) return conn.close(1008, "Unauthorized");
    if (!user.sessions.has(id)) return conn.close(1011, "Invalid session");

    const session = await Session.byId(id);
    if (!session) return conn.close(1011, "Invalid session");

    const sock = Socket.fromWebSocket(conn, { timeout: 30e3 });

    sock.send("session", {
        binaries: [...session.binaries.keys()],
        commands: session.commands,
        status: session.status,
        history: session.history.length,
    });

    const emitter = new Evented();
    sock.on("message", (...args) => emitter.emit(...args));

    for (const event of session.history) {
        sock.send(...event);
    }

    sock.own(session.on("*", (...args) => sock.send(...args)));

    if (session.status === Session.STATUS.DONE || session.status === Session.STATUS.DELETED) {
        return sock.close(1000, "Done");
    }

    let lastPos = NaN;
    const sendQueued = () => {
        const pos = queue.position(session);
        if (!Number.isNaN(pos) && pos !== lastPos) {
            lastPos = pos;
            sock.send("queued", pos, queue.workers);
        }
    };
    sock.own(queue.on(["tick", "task"], sendQueued));
    sendQueued();

    await session.once(["done", "delete"]);

    if (!sock.closed) sock.close(1000, "Done");
});

server.http("~/session/dl/:id", async (req, res, { id }) => {
    const [user] = await auth.token(req);
    if (!user) return server.serve("error/403", req, res);

    if (id !== "healthcheck") {
        id = Buffer.from(id, "base64url").toString("binary");
    }
    const session = await Session.byId(id);
    if (!session) return server.serve("error/404", req, res);

    const { binaries, commands, timeout } = session;
    const buffer = serialize({ binaries, commands, timeout });

    res.writeHead(200, {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
    });
    res.end(buffer);
});

server.ws("/worker/demo", async (conn, req) => {
    if (!opts.demo) {
        return conn.close(1011, "Not a demo server");
    }
    return server.serve("/worker", conn, req);
});

server.ws("/worker", async (conn, req) => {
    const [user] = await auth.token(req);
    if (!user) return conn.close(1008, "Unauthorized");

    const sock = Socket.fromWebSocket(conn, { timeout: 30e3 });
    const worker = new Worker(sock, queue);

    try {
        await worker.run();
    } catch (err) {
        console.error(err);
    }
});

server.upgrade("/ws", (req, socket, head) => ui.serve(req, socket, head, {}));

server.http("~/auth/:path(.*)?", (req, res) => auth.serve(req, res));

server.http("~/dl/:path(.*)", (req, res, { path }) => {
    res.setHeader("Content-Disposition", `attachment; filename=${basename(path)}`);
    return dl.serve(req, res, { path: `/${path}` });
});

server.http("~/:path(.*)", (req, res) => {
    cookie.set(res, "gcid", opts.gapi);
    return ui.serve(req, res, {});
});

server.listen(opts.listen);
console.log(`running at ${opts.listen
    .replace(/^tcp:\/\/0.0.0.0/, "tcp://localhost")
    .replace(/^tcp:/, opts.tls ? "https:" : "http:")}`);
