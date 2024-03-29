import { Observable } from "lib0/observable";

import google from "./gsi.js";
import User from "./User.js";

import * as cookie from "./cookie.js";
import * as storage from "./storage.js";

const CLIENT_ID = cookie.get("gcid");

class Auth extends Observable {
    #google = null;
    #id = null;
    #oauth2 = null;
    #client = null;

    #user = null;
    #tokens = [];

    constructor() {
        super();
        this.#init();
        storage.onchange(this.#onChange);
        this.#onChange();
    }

    #onChange = () => {
        const user = storage.get("identity");
        const changed = !User.eq(user, this.#user);

        this.#getTokens();

        if (!user) {
            cookie.del("identity");

            if (changed) {
                this.#user = null;
                this.emit("logout", []);
                this.emit("change", []);
            }
        } else {
            // always update the cookies, it doesn't hurt
            // and helps ensure the cookies are in sync.
            cookie.set("identity", user.uuid);

            if (changed) {
                this.#user = new User(user);
                this.emit("login", []);
                this.emit("change", []);
            }
        }
    };

    #save(identity) {
        if (identity) {
            storage.set("identity", identity);
            cookie.set("identity", identity.uuid);
        } else {
            storage.del("identity");
            cookie.del("identity");
        }
        this.#onChange();
    }

    #init = async () => {
        this.#google = await google;
        this.#id = this.#google.accounts.id;
        this.#id.initialize({
            client_id: CLIENT_ID,
            callback: this.#handleCredentialResponse,
            auto_select: true,
            login_uri: globalThis.location.origin,
        });
        this.#oauth2 = this.#google.accounts.oauth2;
        this.#client = this.#oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
            callback: this.#handleOauthResponse,
        });
        this.#save(await (await fetch("/auth/query")).json());
        delete this.then;
        this.emit("loaded", []);
    };

    // eslint-disable-next-line class-methods-use-this
    #handleCredentialResponse = async (response) => {
        this.#save(await (await fetch("/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: response.credential }),
        })).json());
    };

    #handleOauthResponse = async (response) => {
        this.#save(await (await fetch("/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: response.access_token }),
        })).json());
    };

    get loaded() { return !!this.#id; }

    // Make the class awaitable
    then = (callback) => {
        this.once("loaded", () => callback(this));
    };

    login() {
        if (!this.loaded) return;
        // Clear the g_state cookie to avoid a potential exponential cooldown.
        cookie.del("g_state");
        this.#id.prompt((notification) => {
            if (notification.isNotDisplayed()) {
                // OneTap didn't work, try the pop-up
                this.#client.requestAccessToken();
            }
        });
    }

    async logout() {
        this.#google.accounts.id.disableAutoSelect();
        this.#save(null);
    }

    // eslint-disable-next-line class-methods-use-this
    get tokens() {
        if (!this.#tokens) return [];
        return this.#tokens.slice();
    }

    async newToken() {
        await (await fetch("/auth/token/new")).json();
        this.#getTokens();
    }

    async remToken(token) {
        await (await fetch("/auth/token/del", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
        })).json();
        this.#getTokens();
    }

    #getTokens = async () => {
        this.#tokens = await (await fetch("/auth/token/list")).json();
        this.emit("tokens", []);
    };

    syncCookie() {
        if (this.authorized) {
            cookie.set("identity", this.user.uuid);
        } else {
            cookie.del("identity");
        }
    }

    get authorized() {
        return !!this.#user;
    }

    get user() {
        return this.#user;
    }
}

const auth = new Auth();

export default auth;
