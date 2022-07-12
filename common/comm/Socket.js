import WebSocket from "ws";
import { serialize, deserialize } from "./Packager.js";
import Evented from "../events/Evented.js";

class Socket extends Evented {
    #ws = null;
    #closed = false;

    static fromWebSocket(ws) {
        if (ws.readyState === ws.CLOSED || ws.readyState === ws.CLOSING) {
            throw new Error("WebSocker is closing or already closed");
        }

        const emitter = new Evented();
        ws.on("message", (data) => emitter.emit(...deserialize(data)));
        ws.on("close", (code, reason) => {
            emitter.emit("close", code, reason?.toString());
            emitter.destroy();
        });
        ws.on("open-channel", (name) => {
            emitter.emit("open-channel", name);
        });
        emitter.send = (...args) => ws.send(serialize(args));
        emitter.close = (...args) => {
            emitter.emit("close", ...args);
            ws.close(...args);
        };

        if (ws.readyState === ws.OPEN) {
            return new Socket(emitter);
        }

        return new Promise((resolve, reject) => {
            ws.on("open", () => resolve(new Socket(emitter)));
            ws.on("error", (err) => reject(err));
        });
    }

    static connect(url, opts = {}) {
        const ws = new WebSocket(url, opts);
        return Socket.fromWebSocket(ws);
    }

    constructor(ws) {
        super();
        this.#ws = ws;
        this.#ws.on("message", (...args) => {
            this.emit("message", ...args);
        });
        this.#ws.on("close", (...args) => {
            this.#closed = true;
            this.emit("close", ...args);
            this.destroy();
        });
        this.#ws.on("open-channel", (name) => {
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
        this.#ws.send("message", ...args);
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
        this.#ws.on("channel", (target, ...args) => {
            if (target !== name) return;
            emitter.emit(...args);
        });
        this.#ws.on("close-channel", (target, ...args) => {
            if (target !== name) return;
            this.#channels.delete(name);
            emitter.emit("close", ...args);
            emitter.destroy();
        });
        this.#ws.on("close", (...args) => {
            emitter.emit("close", ...args);
            emitter.destroy();
        });
        emitter.send = (...args) => this.#ws.send("channel", name, ...args);
        emitter.close = (...args) => {
            emitter.emit("close", ...args);
            this.#ws.send("close-channel", name, ...args);
            this.#channels.delete(name);
            emitter.destroy();
        };

        this.#ws.send("open-channel", name);

        const sock = new Socket(emitter);
        this.#channels.set(name, sock);

        this.emit("channel", name, sock);

        return sock;
    }
}

export default Socket;
