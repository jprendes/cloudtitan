import { dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));

const { env } = process;

const DB_ROOT = env.DB_ROOT || "state";
const LISTEN = (env.LISTEN || "tcp://0.0.0.0:8080").replace(/^https?:/, "tcp:");
const HTTPS = (!!env.HTTPS && env.HTTPS !== "0") || (env.LISTEN || "").startsWith("https:");
const GAPI_CLIENT_ID = env.GAPI_CLIENT_ID || "";
const OPENTITANTOOL = env.OPENTITANTOOL || "./opentitantool";

export {
    DB_ROOT,
    HTTPS,
    LISTEN,
    GAPI_CLIENT_ID,
    OPENTITANTOOL,
    ROOT,
};
