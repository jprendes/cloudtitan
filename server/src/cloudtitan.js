#!/usr/bin/node

import HttpServer from "./HttpServer.js";

import {
    UI_ROOT, UI_HOST, UI_PORT, HTTPS, LISTEN, GAPI_CLIENT_ID,
} from "./config.js";

import Connection from "./session/Connection.js";
import Channel from "./utils/Channel.js";
import Static from "./Static.js";
import Proxy from "./Proxy.js";
import Auth from "./auth/Auth.js";
import * as cookie from "./utils/cookie.js";

const auth = new Auth();

const queue = new Channel();

async function worker(q) {
    for await (const task of q.tasks) {
        try {
            await task();
        } catch (err) {
            console.error(err);
        }
    }
}

worker(queue);

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
    if (token !== "hola mundo") {
        conn.close(1008, "Unauthorized");
        return;
    }

    const manager = new Connection(conn, queue, 500e3, 2e3);
    await new Promise((resolve) => { manager.on("end", resolve); });
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
