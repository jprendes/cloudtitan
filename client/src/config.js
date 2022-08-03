import fse from "fs-extra";
import { dirname, join, normalize } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";

let root;
if (typeof __dirname === "undefined") {
    root = normalize(join(dirname(fileURLToPath(import.meta.url)), ".."));
} else {
    root = normalize(join(__dirname, ".."));
}

const ROOT = root;
const CONFIG_DIR = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");

const embeddedDefaults = await fse.readJson(join(ROOT, "assets", "cloudtitan.json")).catch(() => ({}));
const userDefaults = await fse.readJson(join(CONFIG_DIR, "cloudtitan", "client.json")).catch(() => ({}));

const DEFAULTS = {
    timeout: 2,
    ...embeddedDefaults,
    ...userDefaults,
};

export {
    ROOT,
    CONFIG_DIR,
    DEFAULTS,
};
