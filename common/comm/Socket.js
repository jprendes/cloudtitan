import WebSocket from "ws";
import { serialize, deserialize } from "./Packager.js";
import Evented from "../events/Evented.js";
import Watchdog from "../utils/Watchdog.js";

function setupWatchdog(ws, emitter, timeout) {
    // Ensure there's activity in the socket every timeout / 2 time
    const activity = new Watchdog(timeout / 2);
    ws.on("ping", () => activity.tick());
    ws.on("pong", () => activity.tick());
    ws.on("message", () => activity.tick());
    activity.on("alert", () => ws.ping());
    activity.tick();

    // Terminate the socket if there's no activity in over timeout time
    const terminate = Watchdog.fromEvent(activity, "tick", timeout);
    terminate.on("alert", () => {
        emitter.emit("close", 1002, "Ping timeout");
        ws.terminate();
    });

    emitter.own(activity);
    emitter.own(terminate);
}

const EVTS = {
    MESSAGE: 0, // message on this channel
    OPEN: 1, // open a subchannel
    CLOSE: 2, // close a subchannel
    ROUTE: 3, // route a message to a sub channel
};

class Socket extends Evented {
    #ws = null;
    #closed = false;

    static fromWebSocket(ws, { timeout = 30e3 } = {}) {
        if (ws.readyState === ws.CLOSED || ws.readyState === ws.CLOSING) {
            throw new Error("WebSocket is closing or already closed");
        }

        const emitter = new Evented();
        ws.on("message", (data) => emitter.emit(...deserialize(data)));
        ws.on("close", (code, reason) => {
            emitter.emit("close", code, reason?.toString());
            emitter.destroy();
        });
        emitter.send = (...args) => ws.send(serialize(args));
        emitter.close = (...args) => {
            emitter.emit("close", ...args);
            emitter.destroy();
            ws.close(...args);
        };

        setupWatchdog(ws, emitter, timeout);

        if (ws.readyState === ws.OPEN) {
            return new Socket(emitter);
        }

        return new Promise((resolve, reject) => {
            ws.on("open", () => resolve(new Socket(emitter)));
            ws.on("error", (err) => reject(err));
        });
    }

    static connect(url, { timeout = 30e3, ...opts } = {}) {
        const ws = new WebSocket(url, opts);
        return Socket.fromWebSocket(ws, { timeout });
    }

    constructor(ws) {
        super();
        this.#ws = ws;
        this.#ws.on(EVTS.MESSAGE, (...args) => {
            this.emit("message", ...args);
        });
        this.#ws.on("close", (...args) => {
            this.#closed = true;
            this.emit("close", ...args);
            this.destroy();
        });
        this.#ws.on(EVTS.OPEN, (name) => {
            this.channel(name);
        });
    }

    get closed() { return this.#closed; }

    #ensureOpen = () => {
        if (this.closed) throw new Error("Socket is already closed.");
    };

    on(...args) {
        this.#ensureOpen();
        return super.on(...args);
    }

    once(...args) {
        this.#ensureOpen();
        return super.once(...args);
    }

    send(...args) {
        this.#ensureOpen();
        this.#ws.send(EVTS.MESSAGE, ...args);
    }

    close(...args) {
        this.#ensureOpen();
        this.#ws.close(...args);
    }

    #channels = new Map();
    get channels() { return new Map(this.#channels); }
    channel(name) {
        this.#ensureOpen();

        if (this.#channels.has(name)) return this.#channels.get(name);

        const emitter = new Evented();
        this.#ws.on(EVTS.ROUTE, (target, ...args) => {
            if (target !== name) return;
            emitter.emit(...args);
        });
        this.#ws.on(EVTS.CLOSE, (target, ...args) => {
            if (target !== name) return;
            this.#channels.delete(name);
            emitter.emit("close", ...args);
            emitter.destroy();
        });
        this.#ws.on("close", (...args) => {
            emitter.emit("close", ...args);
            emitter.destroy();
        });
        emitter.send = (...args) => this.#ws.send(EVTS.ROUTE, name, ...args);
        emitter.close = (...args) => {
            emitter.emit("close", ...args);
            this.#ws.send(EVTS.CLOSE, name, ...args);
            this.#channels.delete(name);
            emitter.destroy();
        };

        this.#ws.send(EVTS.OPEN, name);

        const sock = new Socket(emitter);
        this.#channels.set(name, sock);

        this.emit("channel", name, sock);

        return sock;
    }
}

export default Socket;
