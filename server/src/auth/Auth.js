import { STATUS_CODES, IncomingMessage } from "http";

import Evented from "cloudtitan-common/events/Evented.js";
import { serialize } from "cloudtitan-common/comm/Packager.js";

import * as cookie from "../utils/cookie.js";

import User from "./User.js";
import { stringify, parseOr } from "../utils/token.js";

function sendJSON(res, val) {
    res.writeHead(200, {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
    });
    res.end(JSON.stringify(val));
}

class Auth extends Evented {
    static COOKIES = serialize(
        Object.entries(User.PROVIDERS)
            .map(([id, provider]) => [id, provider.clientId]),
    );

    constructor() {
        super();
        // set default onError handler
        this.onError(null);
        this.#handlers = {
            "/auth/login": this.#serve_login,
            "/auth/logout": this.#serve_logout,
            "/auth/query": this.#serve_query,
            "/auth/token/new": this.#serve_new_tokens,
            "/auth/token/del": this.#serve_rm_tokens,
            "/auth/token/list": this.#serve_ls_tokens,
        };
    }

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

    // eslint-disable-next-line class-methods-use-this
    async login(token) {
        if (token instanceof IncomingMessage) token = cookie.get(token, "identity");
        if (!token) return [null];
        const [id, tok] = parseOr(token, [null]);
        if (!id) return [null];
        const user = await User.byId(id);
        if (!user) return [null];
        if (!user.login.has(tok)) return [null];
        const metadata = user.login.get(tok);
        return [user, tok, metadata];
    }

    // eslint-disable-next-line class-methods-use-this
    async token(token) {
        if (token instanceof IncomingMessage) token = token.headers?.["auth-token"];
        if (!token) return [null];
        const [id, tok] = parseOr(token, [null]);
        if (!id) return [null];
        const user = await User.byId(id);
        if (!user) return [null];
        if (!user.tokens.has(tok)) return [null];
        const metadata = user.tokens.get(tok);
        return [user, tok, metadata];
    }

    async login_authorized(identity) {
        const [user] = await this.login(identity);
        return !!user;
    }

    async token_authorized(token) {
        const [user] = await this.token(token);
        return !!user;
    }

    #serve_login = async (req, res) => {
        const body = await new Promise((resolve, reject) => {
            const chunks = [];
            req.on("data", (fragments) => chunks.push(fragments));
            req.on("end", () => resolve(Buffer.concat(chunks)));
            req.on("error", reject);
        });

        const user = await User.fromProviderToken(serialize(JSON.parse(body)));

        if (!user) return this.#serve_logout(req, res);

        let token = await user.login.add();
        token = stringify([user.id, token]);

        cookie.set(res, "identity", token);

        sendJSON(res, {
            uuid: token,
            domain: user.domain,
            email: user.email,
            name: user.name,
            photo: user.photo,
        });
    };

    // eslint-disable-next-line class-methods-use-this
    #serve_logout = async (req, res) => {
        const [user, token] = await this.login(req);
        user?.login.delete(token);
        cookie.del(res, "identity");
        sendJSON(res, null);
    };

    #serve_query = async (req, res) => {
        const [user, token] = await this.login(req);
        if (!user) return this.#serve_logout(req, res);
        return sendJSON(res, {
            uuid: token,
            domain: user.domain,
            email: user.email,
            name: user.name,
            photo: user.photo,
        });
    };

    #serve_ls_tokens = async (req, res) => {
        const [user] = await this.login(req);
        if (!user) return this.#serve_logout(req, res);
        const tokens = [...user.tokens.keys()]
            .map((tok) => stringify([user.id, tok]));
        return sendJSON(res, tokens);
    };

    #serve_new_tokens = async (req, res) => {
        const [user] = await this.login(req);
        if (!user) return this.#serve_logout(req, res);
        let token = await user.tokens.add();
        token = stringify([user.id, token]);
        sendJSON(res, token);
    };

    #serve_rm_tokens = async (req, res) => {
        const body = await new Promise((resolve, reject) => {
            const chunks = [];
            req.on("data", (fragments) => chunks.push(fragments));
            req.on("end", () => resolve(Buffer.concat(chunks).toString()));
            req.on("error", reject);
        });

        const [user] = await this.login(req);
        if (!user) return this.#serve_logout(req, res);

        const { token } = JSON.parse(body);

        const [u, tok] = await this.token(token);
        if (u !== user) return sendJSON(res, { error: "Invalid token" });

        user.tokens.delete(tok);
        return sendJSON(res, { success: true });
    };
}

export default Auth;
