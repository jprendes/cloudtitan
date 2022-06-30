#!/usr/bin/node

import HttpServer from "./HttpServer.js";
import zlib from "zlib";
import { spawn } from "node-pty";

import {
    HTTPS, LISTEN, OPENTITANTOOL,
} from "./config.js";
import { readFileSync } from "fs";
import { writeFile } from "fs/promises";

const server = new HttpServer({
    https: HTTPS,
    logError: console.error,
});

const decompress = (data) => new Promise((resolve, reject) => {
    zlib.gunzip(data, (err, result) => {
        if (err) reject(err);
        resolve(result);
    });
})

const defaultBitstream = readFileSync("./lowrisc_systems_chip_earlgrey_cw310_0.1.bit.orig");
const defaultFirmware = readFileSync("./hello_world_fpga_cw310.bin");

async function writeAsyncFile(path, firmware) {
    return writeFile(path, await firmware);
}

function ott(...args) {
    const control = spawn(OPENTITANTOOL, args, {
        stdio: "pipe",
    });
    const done = new Promise((resolve) => {
        control.onExit((...args) => resolve(args));
    });
    return {
        child: control,
        kill: () => control.kill("SIGKILL"),
        then: (...args) => done.then(...args),
        onData: (f) => control.onData(f),
    }
}

server.ws("/ws", (conn, req) => {
    const token = req.headers?.["auth-token"];
    if (token !== "hola mundo") {
        conn.close(1008, "Unauthorized");
        return;
    }

    let bitstream = defaultBitstream;
    let firmware = defaultFirmware;

    const start = () => {
        const bitstreamDone = writeAsyncFile("/tmp/bitstream", bitstream);
        const firmwareDone = writeAsyncFile("/tmp/firmware", firmware);

        const tty = ott("console", "--baudrate", "115200");

        let control;

        let kill = () => {
            tty.kill();
            control?.kill();
        };

        const controller = (async () => {
            await bitstreamDone;
            control = ott("load-bitstream", "/tmp/bitstream");
            control.onData((data) => conn.send(data));
            await control;

            // only attach the tty output now to avoid the "[CTRL+C] to exit." message.
            tty.onData((data) => conn.send(data));

            control = ott("set-pll");
            control.onData((data) => conn.send(data));
            await control;

            await firmwareDone;
            control = ott("bootstrap", "/tmp/firmware");
            control.onData((data) => conn.send(data));
            await control;

            control = null;
        })();
        
        return {
            control: controller,
            console: tty,
            kill,
        }
    };

    const run = async () => {
        try {
            const child = start();
            setTimeout(() => child.kill(), 60e3);
            conn.on("close", () => child.kill());
            await child.control;
            await child.console;
            conn.close(1000, "Done");
        } catch (err) {
            console.error(err);
        }
    };

    conn.on("message", (data, isBinary) => {
        if (isBinary) {
            const type = data.slice(0,1).toString();
            data = data.slice(1);
            if (type === "b") {
                bitstream = decompress(data);
            } else if (type === "f") {
                firmware = decompress(data);
            } else {
                conn.close(1002, "Invalid binary message");
            }
        } else {
            data = data.toString();
            if (data === "start") {
                run();
            } else {
                conn.close(1002, "Invalid text message");
            }
        }
    });

    return new Promise((resolve) => {
        conn.on("close", resolve);
    })
})

server.listen(LISTEN);
console.log(`running at ${LISTEN
    .replace(/^tcp:\/\/0.0.0.0/, "tcp://localhost")
    .replace(/^tcp:/, HTTPS ? "https:" : "http")}`);
