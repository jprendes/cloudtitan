import Evented from "cloudtitan-common/events/Evented.js";
import uuid from "cloudtitan-common/utils/uuid.js";

import GoogleOAuth2 from "./GoogleOAuth2.js";

import DB from "../DB.js";
import { GAPI_CLIENT_ID } from "../config.js";

const db = new DB("users");

const googleAuth = new GoogleOAuth2(GAPI_CLIENT_ID);

class Users extends Evented {
    #byUuid = new Map();
    #byId = new Map();
    #byToken = new Map();

    #init = async () => {
        for await (const [key, value] of db.iterator()) {
            value.tokens = value.tokens || [await uuid()];
            this.#byId.set(key, value);
            this.#byUuid.set(value.uuid, value);
            for (const token of value.tokens) {
                this.#byToken.set(token, value);
            }
        }
        delete this.then;
        this.emit("loaded", []);
    };

    constructor() {
        super();
        this.#init();
    }

    // Make the class awaitable
    then = (callback) => {
        this.once("loaded", () => callback(this));
    };

    // eslint-disable-next-line no-shadow
    byUuid(uuid) {
        return this.#byUuid.get(uuid) || null;
    }

    byId(id) {
        return this.#byId.get(id) || null;
    }

    byToken(token) {
        return this.#byToken.get(token) || null;
    }

    async newToken(user) {
        user = this.byUuid(user.uuid);
        const token = await uuid();
        user.tokens.push(token);
        this.#byToken.set(token, user);
        db.set(user.id, user);
        return token;
    }

    removeToken(token) {
        const user = this.byToken(token);
        user.tokens = user.tokens.filter((t) => t !== token);
        this.#byToken.delete(token);
        db.set(user.id, user);
    }

    async fromToken(token) {
        const user = await googleAuth.verify(token);
        if (!user) return null;

        const persisted = this.byId(user.id);

        if (!persisted) {
            user.uuid = await uuid();
            user.tokens = [];
            this.#byId.set(user.id, user);
            this.#byUuid.set(user.uuid, user);
            db.set(user.id, user);
            return user;
        }

        Object.assign(persisted, user);
        db.set(user.id, persisted);
        return persisted;
    }
}

export default Users;
