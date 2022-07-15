import { readJson } from "fs-extra";
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

const embeddedDefaults = await readJson(join(ROOT, "assets", "cloudtitan.json")).catch(() => ({}));
const userDefaults = await readJson(join(homedir(), "cloudtitan.json")).catch(() => ({}));

const DEFAULTS = {
    ...embeddedDefaults,
    ...userDefaults,
}

export {
    // eslint-disable-next-line import/prefer-default-export
    ROOT,
    BW_RO_BINDS,
    DEFAULTS,
};
