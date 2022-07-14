import { dirname, join, normalize } from "path";
import { fileURLToPath } from "url";

let root;
if (typeof __dirname === "undefined") {
    root = normalize(join(dirname(fileURLToPath(import.meta.url)), ".."));
} else {
    root = normalize(join(__dirname, ".."));
}

const ROOT = root;

const { env } = process;

const UI_ROOT = env.UI_ROOT || "";
const UI_HOST = env.UI_HOST || "localhost";
const UI_PORT = parseInt(env.UI_PORT, 10) || 8088;

const DL_ROOT = env.DL_ROOT || normalize(join(ROOT, "..", "dist"));
const DL_HOST = env.DL_HOST || "";
const DL_PORT = 80;

const DB_ROOT = env.DB_ROOT || "state";
const LISTEN = (env.LISTEN || "tcp://0.0.0.0:8080").replace(/^https?:/, "tcp:");
const HTTPS = (!!env.HTTPS && env.HTTPS !== "0") || (env.LISTEN || "").startsWith("https:");
const GAPI_CLIENT_ID = env.GAPI_CLIENT_ID || "";
const OPENTITANTOOL = env.OPENTITANTOOL || "./opentitantool";

export {
    UI_ROOT,
    UI_HOST,
    UI_PORT,

    DL_ROOT,
    DL_HOST,
    DL_PORT,

    DB_ROOT,
    HTTPS,
    LISTEN,
    GAPI_CLIENT_ID,
    OPENTITANTOOL,
    ROOT,
};
