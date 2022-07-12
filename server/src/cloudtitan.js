#!/usr/bin/node

import Socket from "cloudtitan-common/comm/Socket.js";
import { IpcClient, IpcHost } from "cloudtitan-common/comm/Ipc.js";

import { v4 as uuidv4 } from "uuid";
import HttpServer from "./HttpServer.js";

import {
    UI_ROOT, UI_HOST, UI_PORT, HTTPS, LISTEN, GAPI_CLIENT_ID,
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

function session(req, res) {
    cookie.set(res, "gcid", GAPI_CLIENT_ID);
}

let ui;
if (UI_ROOT) {
    ui = Static.fromRoot(UI_ROOT);
} else {
    ui = new Proxy({ target: { host: UI_HOST, port: UI_PORT } });
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
        const sock = Socket.fromWebSocket(conn);
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

    try {
        const sock = Socket.fromWebSocket(conn);

        const tasks = queue.tasks();
        sock.on("close", () => tasks.abort());

        for await (const task of tasks) {
            try {
                const uuid = uuidv4();
                const channel = sock.channel(uuid);
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

server.http("~/:path(.*)", (req, res) => {
    session(req, res);
    return ui.serve(req, res, {});
});

server.listen(LISTEN);
console.log(`running at ${LISTEN
    .replace(/^tcp:\/\/0.0.0.0/, "tcp://localhost")
    .replace(/^tcp:/, HTTPS ? "https:" : "http:")}`);
