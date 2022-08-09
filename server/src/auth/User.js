import { serialize, deserialize } from "cloudtitan-common/comm/Packager.js";
import uuid from "cloudtitan-common/utils/uuid.js";
import GoogleOAuth2 from "./GoogleOAuth2.js";

import opts from "../main.js";
import Persisted from "../utils/Persisted.js";

import database from "../DB.js";
import ObservableMap from "../utils/ObservablMap.js";

const PROVIDERS = Object.freeze({
    "845a0f31f06739abfd627cc0b3209231": new GoogleOAuth2(opts.gapi),
});

const db = database.sublevel("users");

const aliases = db.sublevel("aliases");

function tokenSet(underlying, onchange) {
    return new ObservableMap(underlying, {
        onset: async (s, metadata = {}) => {
            let token = await uuid();
            while (s.has(token)) {
                // eslint-disable-next-line no-await-in-loop
                token = await uuid();
            }
            s.underlying.set(token, {
                creation: Date.now(),
                ...metadata,
            });
            await onchange();
            return token;
        },
        ondelete: async (s, ...args) => {
            s.underlying.delete(...args);
            await onchange();
        },
    });
}

function sessionSet(underlying, onchange) {
    return new ObservableMap(underlying, {
        onset: async (s, key, metadata = {}) => {
            s.underlying.set(key, {
                creation: Date.now(),
                ...metadata,
            });
            await onchange();
        },
        ondelete: async (s, ...args) => {
            s.underlying.delete(...args);
            await onchange();
        },
    });
}

class User extends Persisted(db.sublevel("data")) {
    static get PROVIDERS() { return PROVIDERS; }

    static async byAlias(alias) {
        const id = await aliases.get(alias);
        return id && this.byId(id);
    }

    static async fromProviderToken(providerToken) {
        const {
            provider = "845a0f31f06739abfd627cc0b3209231",
            token,
        } = deserialize(providerToken);
        const data = await PROVIDERS[provider].verify(token);

        if (!data) return null;

        const { id, ...rest } = data;

        const alias = serialize([provider, id]).toString("binary");

        let user = await User.byAlias(alias);
        if (!user) {
            user = await User.new(rest);
            await aliases.set(alias, user.id);
        }

        return user;
    }

    #data = null;
    #login = null;
    #tokens = null;
    #sessions = null;

    constructor(id, data) {
        super(id);

        if (data.login instanceof Set) {
            delete data.login;
        }
        if (data.tokens instanceof Set) {
            delete data.tokens;
        }

        this.#data = {
            login: new Map(),
            tokens: new Map(),
            sessions: new Map(),
            ...data,
        };

        this.#login = tokenSet(this.#data.login, () => this.save());
        this.#tokens = tokenSet(this.#data.tokens, () => this.save());
        this.#sessions = sessionSet(this.#data.sessions, () => this.save());
    }

    save() {
        return super.save(this.#data);
    }

    get login() { return this.#login; }
    get tokens() { return this.#tokens; }
    get sessions() { return this.#sessions; }

    get domain() { return this.#data.domain; }
    get email() { return this.#data.email; }
    get name() { return this.#data.name; }
    get photo() { return this.#data.photo; }
}

export default User;
