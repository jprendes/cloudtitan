#!/usr/bin/node

import HttpServer from "./HttpServer.js";
import zlib from "zlib";

import Session from "./session/Session.js";

import {
    HTTPS, LISTEN,
} from "./config.js";
import { readFileSync } from "fs";
import { writeFile } from "fs/promises";

import { serialize, deserialize } from "./utils/Packager.js";
import Connection from "./session/Connection.js";

const server = new HttpServer({
    https: HTTPS,
    logError: console.error,
});

server.ws("/client", (conn, req) => {
    const token = req.headers?.["auth-token"];
    if (token !== "hola mundo") {
        conn.close(1008, "Unauthorized");
        return;
    }

    const manager = new Connection(conn, 300e3, 2e3);
    return new Promise((resolve) => {
        manager.on("end", resolve);
    });
})

server.listen(LISTEN);
console.log(`running at ${LISTEN
    .replace(/^tcp:\/\/0.0.0.0/, "tcp://localhost")
    .replace(/^tcp:/, HTTPS ? "https:" : "http:")}`);
