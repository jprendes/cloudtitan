import { v4 as uuidv4 } from "uuid";
import GoogleOAuth2 from "./GoogleOAuth2.js";

import Evented from "../utils/Evented.js";
import DB from "../DB.js";
import { GAPI_CLIENT_ID } from "../config.js";

const db = new DB("users");

const googleAuth = new GoogleOAuth2(GAPI_CLIENT_ID);

class Users extends Evented {
    #byUuid = new Map();
    #byId = new Map();

    #init = async () => {
        for await (const [key, value] of db.iterator()) {
            this.#byId.set(key, value);
            this.#byUuid.set(value.uuid, value);
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

    byUuid(uuid) {
        return this.#byUuid.get(uuid) || null;
    }

    byId(id) {
        return this.#byId.get(id) || null;
    }

    async fromToken(token) {
        const user = await googleAuth.verify(token);
        if (!user) return null;

        const persisted = this.byId(user.id);

        if (!persisted) {
            user.uuid = uuidv4();
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
