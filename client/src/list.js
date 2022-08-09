import { Agent } from "https";

import fetch from "node-fetch";

import { reduce } from "./session.js";

import {
    stderr, COLORS, pad,
} from "./write.js";

function relativeTimeFormat(time) {
    const units = [["second", 60], ["minute", 60], ["hour", 24], ["day", 7], ["week", 365 / 12 / 7], ["month", 12], ["year", Infinity]];
    let val = (time - Date.now()) / 1e3;
    let unit = units[0][0];

    while (Math.abs(val) > 0.8 * units[0][1]) {
        val /= units[0][1];
        units.shift();
        [[unit]] = units;
    }

    const rtf = new Intl.RelativeTimeFormat("en", { style: "narrow" });
    return rtf.format(Math.round(val), unit);
}

export default async (opts) => {
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
        throw new Error("Jobs listing failed");
    }

    const sessions = await res.json();
    stderr.color(COLORS.YELLOW).bold().println("Sessions:");

    if (sessions.length === 0) {
        stderr.color(COLORS.YELLOW).println("  No Sessions");
        return;
    }

    const data = [
        ["", "ID", "  Creation", "  Status"],
        ...sessions.map(([id, { status, creationDate }], i) => [
            `  ${i + 1}.  `,
            id,
            `  ${relativeTimeFormat(creationDate)}`,
            `  ${status}`,
        ]),
    ];

    (await reduce(data.map(([, id]) => id), opts)).forEach((id, i) => {
        data[i][1] = id;
    });

    const widths = Array(data[0].length).fill(0)
        .map((_, i) => Math.max(...data.map((v) => v[i].length)));

    data.forEach(([index, id, creationDate, status], i) => {
        index = pad(index, widths[0], { align: "left" });
        id = pad(id, widths[1], { align: "left" });
        creationDate = pad(creationDate, widths[2], { align: "left" });
        status = pad(status, widths[3], { align: "left" });
        let out = stderr.color(COLORS.YELLOW);
        if (i === 0) out = out.bold();
        out.bold().print(index);
        out.print(`${id}${creationDate}${status}\n`);
    });
};
