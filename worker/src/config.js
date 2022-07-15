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
};

const DEFAULT_BW_RO_BINDS = DEFAULTS.BW_RO_BINDS || [
    "/run/udev",
    "/sys/bus/usb",
    "/sys/class/tty",
    "/sys/devices",
    "/usr",
    "/bin",
    "/lib",
    "/lib64",
];

const BW_RO_BINDS = (process.env.BW_RO_BINDS || DEFAULT_BW_RO_BINDS.join(":")).split(":");

export {
    // eslint-disable-next-line import/prefer-default-export
    ROOT,
    BW_RO_BINDS,
    DEFAULTS,
};
