import { dirname, join, normalize } from "path";
import { fileURLToPath } from "url";

let root;
if (typeof __dirname === "undefined") {
    root = normalize(join(dirname(fileURLToPath(import.meta.url)), ".."));
} else {
    root = normalize(join(__dirname, ".."));
}

const ROOT = root;

const DEFAULT_BW_RO_BINDS = [
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
};
