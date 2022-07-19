#!/usr/bin/node

import { basename } from "path";

import Socket from "cloudtitan-common/comm/Socket.js";
import { IpcClient, IpcHost } from "cloudtitan-common/comm/Ipc.js";

import { v4 as uuidv4 } from "uuid";
import HttpServer from "./HttpServer.js";

import {
    UI_ROOT, UI_HOST, UI_PORT,
    DL_ROOT, DL_HOST, DL_PORT,
    HTTPS, LISTEN, GAPI_CLIENT_ID,
} from "./config.js";

import Api from "./session/Api.js";
import Channel from "./utils/Channel.js";
import Static from "./Static.js";
import Proxy from "./Proxy.js";
import Auth from "./auth/Auth.js";
import * as cookie from "./utils/cookie.js";

process.on("unhandledRejection", (error) => {
    console.error("Unhandled Promise Rejection", error);
});

const auth = new Auth();

const queue = new Channel();

let ui;
if (UI_ROOT) {
    ui = Static.fromRoot(UI_ROOT);
} else {
    ui = new Proxy({ target: { host: UI_HOST, port: UI_PORT } });
}

let dl;
if (DL_HOST) {
    dl = new Proxy({ target: { host: DL_HOST, port: DL_PORT } });
} else {
    dl = Static.fromRoot(DL_ROOT);
}

const server = new HttpServer({
    https: HTTPS,
    logError: console.error,
});

server.ws("/client", async (conn, req) => {
    const token = req.headers?.["auth-token"];
    const user = auth.authorized(token);
    if (!user) {
        conn.close(1008, "Unauthorized");
        return;
    }

    try {
        const sock = Socket.fromWebSocket(conn, { timeout: 30e3 });
        const api = new Api(queue, 120e3);
        const apiIpc = new IpcHost(sock, api);

        await api.wait();
        await apiIpc.close();
    } catch (err) {
        // console.err(err);
    }
});

server.ws("/worker", async (conn, req) => {
    const token = req.headers?.["auth-token"];
    const user = auth.authorized(token);
    if (!user) {
        conn.close(1008, "Unauthorized");
        return;
    }

    const sock = Socket.fromWebSocket(conn, { timeout: 30e3 });
    const tasks = queue.tasks();
    sock.on("close", () => tasks.abort());

    try {
        for await (const task of tasks) {
            try {
                const channel = sock.channel(uuidv4());
                const ipc = new IpcClient(channel);
                await task(ipc.proxy());
                await ipc.close();
            } catch (err) {
                console.error(err);
                queue.unshift(task);
            }
        }
    } catch (err) {
        // console.err(err);
    }
});

server.upgrade("/ws", (req, socket, head) => ui.serve(req, socket, head, {}));

server.http("~/auth/:path(.*)?", (req, res) => auth.serve(req, res));

server.http("~/dl/:path(.*)", (req, res, { path }) => {
    res.setHeader("Content-Disposition", `attachment; filename=${basename(path)}`);
    return dl.serve(req, res, { path: `/${path}` });
});

server.http("~/:path(.*)", (req, res) => {
    cookie.set(res, "gcid", GAPI_CLIENT_ID);
    return ui.serve(req, res, {});
});

server.listen(LISTEN);
console.log(`running at ${LISTEN
    .replace(/^tcp:\/\/0.0.0.0/, "tcp://localhost")
    .replace(/^tcp:/, HTTPS ? "https:" : "http:")}`);
