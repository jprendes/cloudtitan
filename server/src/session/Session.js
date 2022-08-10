import Evented from "cloudtitan-common/events/Evented.js";
import uuid from "cloudtitan-common/utils/uuid.js";

import database from "../DB.js";
import { binaries as BINARIES, commands as COMMANDS } from "./Healthcheck.js";

const db = database.sublevel("sessions");

class Session extends Evented {
    static get BINARIES() { return BINARIES; }
    static get COMMANDS() { return COMMANDS; }

    static #byId = new Map();
    static async byId(id) {
        if (id === "healthcheck") return new Session("healthcheck", { temp: true, timeout: 20e3 });
        if (Session.#byId.has(id)) return Session.#byId.get(id);
        const data = await db.get(id);
        if (!data) return null;
        const session = new Session(id, data);
        return session;
    }

    static async new({ binaries, commands, owner }) {
        // Create a unique id
        let id = await uuid();
        // eslint-disable-next-line no-await-in-loop
        while (await Session.byId(id)) {
            // eslint-disable-next-line no-await-in-loop
            id = await uuid();
        }

        const session = new Session(id, {
            binaries,
            commands,
            owner,
        });
        await session.save();
        return session;
    }

    static STATUS = Object.freeze({
        PENDING: "pending",
        RUNNING: "running",
        DONE: "done",
        DELETED: "deleted",
    });

    #id = null;
    binaries = null;
    commands = null;
    owner = "";
    history = [];
    status = Session.STATUS.PENDING;
    timeout = 300e3;
    creationDate = Date.now();
    restarts = 0;

    #temp = false;

    constructor(id, {
        binaries = Session.BINARIES,
        commands = Session.COMMANDS,
        owner = "",
        history = [],
        status = Session.STATUS.PENDING,
        creationDate = Date.now(),
        timeout = 300e3,
        restarts = 0,
        temp = false,
    }) {
        super();

        this.#temp = temp;

        if (!binaries || binaries.size === 0) binaries = Session.BINARIES;
        if (!commands || commands.length === 0) commands = Session.COMMANDS;

        this.#id = id;
        this.binaries = binaries;
        this.commands = commands;
        this.owner = owner;
        this.history = history;
        this.status = status;
        this.timeout = timeout;
        this.creationDate = creationDate;
        this.restarts = restarts;

        if (!this.#temp) Session.#byId.set(id, this);
    }

    get id() { return this.#id; }

    save() {
        if (this.#temp) return;
        if (this.status === Session.STATUS.DELETED) return db.delete(this.id);
        return db.set(this.id, {
            binaries: this.binaries,
            commands: this.commands,
            owner: this.owner,
            history: this.history,
            status: this.status,
            timeout: this.timeout,
            creationDate: this.creationDate,
            restarts: this.restarts,
        });
    }

    delete() {
        this.setStatus(Session.STATUS.DELETED);
        if (!this.#temp) Session.#byId.delete(this.id);
    }

    async run(chann) {
        this.setStatus(Session.STATUS.RUNNING);

        let reason = false;
        this.once(["done", "timeout"]).then((evt) => { reason = evt; });
        chann.on("message", this.#remoteEvt);
        await chann.once("close");

        if (!reason) {
            if (this.restarts >= 5) {
                this.#remoteEvt("error", "Session error. Aborting.");
                this.setStatus(Session.STATUS.DONE);
                return true;
            }

            this.restarts += 1;
            this.#remoteEvt("error", "Session error. Restarting.");
            this.setStatus(Session.STATUS.PENDING);
            return false;
        }

        this.binaries = new Map();
        this.setStatus(Session.STATUS.DONE);

        return true;
    }

    setStatus(status) {
        this.status = status;
        this.emit("status");
        this.save();
        if (status === Session.STATUS.DONE) this.emit("done");
        if (status === Session.STATUS.DELETED) this.emit("delete");
    }

    #remoteEvt = (evt, ...args) => {
        this.history.push([evt, Date.now(), ...args]);
        this.emit(evt, Date.now(), ...args);
        this.save();
    };
}

export default Session;
