import { STATUS_CODES, IncomingMessage } from "http";
import * as cookie from "../utils/cookie.js";
import Evented from "../utils/Evented.js";
import DB from "../DB.js";

import Users from "./Users.js";

const db = new DB("tokens");

function sendJSON(res, val) {
    res.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
    });
    res.end(JSON.stringify(val));
}

class Auth extends Evented {
    #users = new Users();

    constructor() {
        super();
        // set default onError handler
        this.onError(null);
        this.#init();
    }

    #init = async () => {
        this.#handlers = {
            "/auth/login": this.#serve_login,
            "/auth/logout": this.#serve_logout,
            "/auth/query": this.#serve_query,
            "/auth/token/new": this.#serve_new_tokens,
            "/auth/token/del": this.#serve_rm_tokens,
            "/auth/token/list": this.#serve_ls_tokens,
        };
        await this.#users;
        delete this.then;
        this.emit("loaded", []);
    };

    // Make the class awaitable
    then = (callback) => {
        this.once("loaded", () => callback(this));
    };

    #onError = null;
    onError(fcn) {
        if (!fcn) {
            fcn = (req, res, { code, status }) => {
                res.writeHead(code, status, { "Content-Type": "text/plain" });
                res.end(status);
            };
        }
        this.#onError = fcn;
        return this;
    }

    #handlers = null;

    async serve(req, res, options = {}) {
        const path = decodeURIComponent(options.path || req.url);
        const handler = this.#handlers[path];
        if (!handler) {
            return this.#onError(req, res, { code: 404, status: STATUS_CODES[404] });
        }
        return handler(req, res);
    }

    user(uuid) {
        if (uuid instanceof IncomingMessage) uuid = cookie.get(uuid, "identity");
        const user = this.#users.byUuid(uuid);
        return user || null;
    }

    authorized(uuid) {
        return !!this.user(uuid);
    }

    #serve_login = async (req, res) => {
        const body = await new Promise((resolve, reject) => {
            const chunks = [];
            req.on("data", (fragments) => chunks.push(fragments));
            req.on("end", () => resolve(Buffer.concat(chunks).toString()));
            req.on("error", reject);
        });

        const { token } = JSON.parse(body);

        await this;
        const user = token && await this.#users.fromToken(token);

        if (!user) {
            await this.#serve_logout(req, res);
            return;
        }

        cookie.set(res, "identity", user.uuid);

        sendJSON(res, user);
    };

    // eslint-disable-next-line class-methods-use-this
    #serve_logout = async (req, res) => {
        cookie.del(res, "identity");
        sendJSON(res, null);
    };

    #serve_query = async (req, res) => {
        await this;
        const user = this.user(req);
        if (!user) {
            await this.#serve_logout(req, res);
            return;
        }
        const { tokens, ...u } = user;
        sendJSON(res, u);
    };

    #serve_ls_tokens = async (req, res) => {
        await this;
        const user = this.user(req);
        if (!user) {
            await this.#serve_logout(req, res);
            return;
        }
        sendJSON(res, user.tokens);
    };

    #serve_new_tokens = async (req, res) => {
        await this;
        const user = this.user(req);
        if (!user) {
            await this.#serve_logout(req, res);
            return;
        }
        const token = this.#users.newToken(user);
        sendJSON(res, token);
    };

    #serve_rm_tokens = async (req, res) => {
        const body = await new Promise((resolve, reject) => {
            const chunks = [];
            req.on("data", (fragments) => chunks.push(fragments));
            req.on("end", () => resolve(Buffer.concat(chunks).toString()));
            req.on("error", reject);
        });

        const { token } = JSON.parse(body);

        await this;
        const user = this.user(req);

        if (!user) {
            await this.#serve_logout(req, res);
            return;
        }
        if (!user.tokens.includes(token)) {
            sendJSON(res, { error: "Invalid token" });
            return;
        }

        this.#users.removeToken(token);
        sendJSON(res, { success: true });
    };
}

export default Auth;
