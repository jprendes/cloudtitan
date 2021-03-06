import { basename } from "path";
import { gunzip } from "zlib";
import fse from "fs-extra";

import Owner from "cloudtitan-common/events/Owner.js";

import { v4 as uuidv4 } from "uuid";
import Process from "../utils/Process.js";
import { ROOT, BW_RO_BINDS } from "../config.js";

const OPENTITANTOOL_BIN = "opentitantool";
const BUBBLEWRAP_BIN = "bwrap";
const BUBBLEWRAP_ARGS = [
    "--unshare-all",
    "--new-session",
    "--die-with-parent",
    "--cap-drop", "ALL",
    "--dev-bind", "/dev", "/dev",
    ...BW_RO_BINDS.flatMap((path) => ["--ro-bind", path, path]),
    "--tmpfs", "/tmp",
    "--proc", "/proc",
    "--setenv", "TERM", "xterm-256color",
];

const decompress = (data) => new Promise((resolve, reject) => {
    gunzip(data, (err, result) => {
        if (err) reject(err);
        resolve(result);
    });
});

class Sandbox extends Owner {
    #processes = new Set();
    #ready = null;
    #root = null;
    #killed = false;

    constructor() {
        super();
        this.#root = `/tmp/cloudtitan-${uuidv4()}`;
        this.#ready = this.#init();
    }

    ready() {
        return this.#ready;
    }

    processes() {
        return new Set(this.#processes);
    }

    #spawn = (...args) => new Process(BUBBLEWRAP_BIN, [
        ...BUBBLEWRAP_ARGS,
        "--setenv", "PATH", "/usr/local/bin:/usr/bin:/usr/local/sbin:/bin:/opentitantool/bin",
        "--setenv", "HOME", "/working",
        "--setenv", "XDG_CONFIG_HOME", "/opentitantool/config",
        "--ro-bind", `${this.#root}/opentitantool`, "/opentitantool",
        "--ro-bind", `${this.#root}/working`, "/working",
        "--chdir", "/working",
        OPENTITANTOOL_BIN,
        "--interface=cw310",
        "--conf=/opentitantool/config/opentitantool/config.d/opentitan_cw310.json",
        ...args,
    ], {
        env: {},
        cols: 1024,
        rows: 300,
    });

    #init = async () => {
        // Run the reload usb command to avoid the sporadic driver problem
        // TODO: Re-enable this
        // await this.#reloadusb();

        await fse.ensureDir(`${this.#root}/working`);
        await fse.copy(`${ROOT}/sandbox/opentitantool`, `${this.#root}/opentitantool`);

        return this;
    };

    get killed() { return this.#killed; }
    async kill() {
        if (this.#killed) return;
        this.#killed = true;
        await Promise.all([...this.#processes.values()].map((process) => process.kill()));
        await fse.remove(this.#root);
        this.#processes = new Set();
        super.destroy();
    }

    #ensureAlive() {
        if (this.killed) throw new Error("Sandbox has been killed");
    }

    async writeFile(name, data) {
        this.#ensureAlive();
        await fse.writeFile(`${this.#root}/working/${basename(name)}`, await decompress(await data));
    }

    writeFiles(binaries) {
        this.#ensureAlive();
        return Promise.all(
            [...binaries.entries()]
                .map(async ([name, data]) => this.writeFile(name, data)),
        );
    }

    run(...args) {
        this.#ensureAlive();
        const process = this.#spawn(...args);
        process.on("exit", () => {
            this.#processes.delete(process);
            process.destroy();
        });
        this.#processes.add(process);
        return process;
    }

    destroy() {
        return this.kill();
    }
}

export default Sandbox;
