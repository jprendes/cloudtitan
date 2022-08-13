import { basename } from "path";
import { readFile } from "fs/promises";
import { Agent } from "https";

import fetch from "node-fetch";

import { compress } from "cloudtitan-common/utils/gzip.js";
import { serialize } from "cloudtitan-common/comm/Packager.js";

import term from "cloudtitan-common/utils/Term.js";

import open from "./open.js";
import { reduce } from "./session.js";

function isBitstream(buffer) {
    return buffer?.subarray(0, 14).toString("base64") === "AAkP8A/wD/AP8AAAAWE=";
}

async function readBinary(path) {
    const filename = `/working/${basename(path)}`;
    const buffer = await readFile(path);
    return { path, filename, buffer };
}

async function readBitstream(path) {
    const { buffer, ...file } = await readBinary(path);
    if (!isBitstream(buffer)) {
        throw new Error(`File '${path}' is not a bitstream.`);
    }
    return {
        ...file,
        buffer: await compress(buffer),
    };
}

async function readFirmware(pathAndOffset) {
    const [path, offset = ""] = pathAndOffset.split(/(@\d+)$/);
    const { buffer, ...file } = await readBinary(path);
    if (isBitstream(buffer)) {
        throw new Error(`File '${path}' is a bitstream. Expected a firmware.`);
    }
    return {
        ...file,
        offset,
        buffer: await compress(buffer),
    };
}

export default async (firmware, { bitstream, timeout, ...opts }) => {
    const {
        tls, selfSigned, authToken,
    } = opts;
    let { host } = opts;

    if (tls) {
        host = `s://${host}`;
    } else {
        host = `://${host}`;
    }

    [bitstream, ...firmware] = await Promise.all([
        bitstream && readBitstream(bitstream),
        ...firmware.map(readFirmware),
    ]);

    if (firmware.length > 1) {
        for (const { path, offset } of firmware) {
            if (!offset) throw new Error(`Firmware file '${path}' needs and offset.`);
        }
    }

    const binaries = new Map();
    const commands = [];
    if (bitstream) {
        binaries.set(bitstream.filename, bitstream.buffer);
        commands.push(["load-bitstream", bitstream.filename]);
        commands.push(["console", "2"]);
    } else {
        commands.push(["load-bitstream", "/working/lowrisc_systems_chip_earlgrey_cw310_0.1.bit.orig"]);
        commands.push(["console", "2"]);
    }
    for (const { filename, buffer } of firmware) {
        binaries.set(filename, buffer);
    }
    if (firmware.length > 0) {
        commands.push(["bootstrap", ...firmware.map(({ filename, offset }) => filename + offset)]);
        commands.push(["console", `${timeout}`]);
    } else {
        commands.push(["bootstrap", "/working/hello_world_fpga_cw310.bin"]);
        commands.push(["console", `${timeout}`]);
    }

    const res = await fetch(`http${host}/session/new`, {
        method: "POST",
        headers: {
            "Content-Type": "application/octet-stream",
            "Auth-Token": authToken,
        },
        body: serialize([binaries, commands]),
        agent: new Agent({ rejectUnauthorized: !selfSigned }),
    });

    if (res.status !== 200) {
        if (res.statusText) {
            throw new Error(`Job upload failed (${res.statusText})`);
        }
        throw new Error("Job upload failed");
    }

    let { id } = await res.json();
    [id] = await reduce([id], opts);
    term.yellow.bold.errorln(`Session: ${id}`);

    return open(id, opts);
};
