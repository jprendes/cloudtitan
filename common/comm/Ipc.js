/* eslint-disable max-classes-per-file */

import { v4 as uuidv4 } from "uuid";
import Evented from "../events/Evented.js";
import Owner from "../events/Owner.js";

import Mutex from "../utils/Mutex.js";

function sanitizePath(path) {
    if (path.some((key) => ["__proto__", "prototype", "constructor"].includes(key))) {
        throw new Error(`Invalid property ipc.${path.join(".")}`);
    }
}

class IpcBase extends Evented {
    #channel = null;
    #sentinel = null;
    #events = null;
    #closing = false;

    mutex = new Mutex();

    constructor(channel) {
        super();

        this.#channel = channel;
        this.#events = channel.channel("events");
        this.#events.on("channel", (name) => {
            this.#setupEventChannel(name);
        });
        for (const evt of this.#events.channels.keys()) {
            this.#setupEventChannel(evt);
        }
        this.#channel.on("close", this.#onClose);
        this.#channelKeepalive();
    }

    #channelKeepalive = async () => {
        const sentinels = this.#channel.channel("sentinels");
        this.#sentinel = sentinels.channel(uuidv4());
        const owner = new Owner();
        await new Promise((resolve) => {
            for (const sock of sentinels.channels.values()) {
                owner.own(sock.once("close", resolve));
            }
            owner.own(sentinels.on("channel", (name, sock) => {
                owner.own(sock.once("close", resolve));
            }));
        });
        owner.destroy();
        if (this.#sentinel.closed) {
            // nothing to do here
        } else if (this.closing) {
            // closing started but hasn't finished
            await this.#sentinel.once("close");
        } else {
            // closing hasn't started
            this.#closing = true;
            await this.mutex.exclusive(() => {
                this.#sentinel.close();
            });
        }
        if (sentinels.channels.size === 0) {
            this.#channel.close();
        }
    };

    get closing() {
        return !this.closed && this.#closing;
    }

    get closed() {
        return this.#channel.closed;
    }

    #eventChannels = new Set();
    #setupEventChannel = (evts) => {
        evts = [].concat(evts);
        for (const evt of evts) {
            if (this.#eventChannels.has(evt)) continue;
            this.#eventChannels.add(evt);
            this.#events.channel(evt).on("message", (...args) => {
                super.emit(evt, ...args);
            });
        }
    };

    on(evts, ...args) {
        this.#setupEventChannel(evts);
        return super.on(evts, ...args);
    }

    once(evts, ...args) {
        this.#setupEventChannel(evts);
        return super.once(evts, ...args);
    }

    emit(evt, ...args) {
        if (!this.closed) {
            this.#events.channel(evt).send(...args);
        }
        super.emit(evt, ...args);
    }

    #onClose = () => {
        this.destroy();
    };

    async close(timeout = -1) {
        if (this.closed) return;

        const done = this.#channel.once("close");

        if (!this.closing) {
            this.#closing = true;
            this.mutex.exclusive(() => {
                this.#sentinel.close();
            });
        }

        if (timeout >= 0) {
            setTimeout(() => this.kill(), timeout);
        }

        return done;
    }

    kill() {
        if (!this.#channel.closed) this.#channel.close();
    }
}

class IpcHost extends IpcBase {
    #events = null;
    #call = null;
    #get = null;
    #set = null;
    #target = null;

    constructor(channel, target) {
        super(channel);
        this.#events = channel.channel("events");
        this.#call = channel.channel("call");
        this.#get = channel.channel("get");
        this.#set = channel.channel("set");
        this.#target = target;

        this.#call.on("message", this.#onCall);
        this.#get.on("message", this.#onGet);
        this.#set.on("message", this.#onSet);
        this.#events.on("channel", this.#onEventChannel);
    }

    destroy() {
        this.#target = null;
        super.destroy();
    }

    #eventChannels = new Set();
    #onEventChannel = (name) => {
        if (this.#eventChannels.has(name)) return;
        this.#eventChannels.add(name);
        this.#target?.on?.(name, (...args) => {
            this.emit(name, ...args);
        });
        // For security, do not emmit on the target
    };

    #getPath = (path) => {
        let res = this.#target;
        for (const key of path) {
            res = res[key];
        }
        return res;
    };

    #onCall = (uuid, path, ...args) => {
        this.mutex.shared(async () => {
            if (this.closed) return;
            const channel = this.#call.channel(uuid);
            try {
                sanitizePath(path);
                const that = this.#getPath(path.slice(0, -1));
                const result = await this.#getPath(path).call(that, ...args);
                channel.send("ok", result);
            } catch (error) {
                channel.send("error", error?.message);
            }
            channel.close();
        });
    };

    #onGet = (uuid, path) => {
        this.mutex.shared(async () => {
            if (this.closed) return;
            const channel = this.#get.channel(uuid);
            try {
                sanitizePath(path);
                const result = await this.#getPath(path);
                channel.send("ok", result);
            } catch (error) {
                channel.send("error", error?.message);
            }
            channel.close();
        });
    };

    #onSet = (uuid, path, val) => {
        this.mutex.shared(async () => {
            if (this.closed) return;
            const channel = this.#set.channel(uuid);
            if (path.length === 0) {
                channel.send("error", "Invalid set target");
                return;
            }
            try {
                sanitizePath(path);
                const result = this.#getPath(path.slice(0, -1));
                result[path.slice(-1)[0]] = val;
                channel.send("ok", undefined);
            } catch (error) {
                channel.send("error", error?.message);
            }
            channel.close();
        });
    };
}

class IpcClient extends IpcBase {
    #call = null;
    #get = null;
    #set = null;

    static CLOSE = Symbol("close");

    constructor(channel) {
        super(channel);
        this.#call = channel.channel("call");
        this.#get = channel.channel("get");
        this.#set = channel.channel("set");
    }

    #ensureOpen = () => {
        if (this.closed) throw new Error("IPC channel already closed");
    };

    #requestResponse = (baseChannel, ...args) => this.mutex.shared(async () => {
        const error = new Error("IPC channel closed prematurely");
        this.#ensureOpen();
        const uuid = uuidv4();
        const channel = baseChannel.channel(uuid);
        const result = new Promise((resolve, reject) => {
            channel.once(["message", "close"], (evt, type, value) => {
                if (evt === "close") {
                    reject(error);
                } else if (type === "ok") {
                    resolve(value);
                } else {
                    reject(value);
                }
            });
        });
        baseChannel.send(uuid, ...args);
        return result;
    });

    call(path, ...args) {
        return this.#requestResponse(this.#call, path, ...args);
    }

    get(path) {
        return this.#requestResponse(this.#get, path);
    }

    set(path, val) {
        return this.#requestResponse(this.#set, path, val);
    }

    #subproxy = (path) => new Proxy(() => {}, {
        get: (_, key) => {
            switch (key) {
            case "then":
                return (...args) => this.get(path).then(...args);
            default:
                return this.#subproxy([...path, key]);
            }
        },
        set: (_, key, val) => this.set([...path, key], val),
        apply: (_, thisArg, args) => this.call(path, ...args),
    });

    #proxy = () => {
        const p = new Proxy(() => {}, {
            get: (_, key) => {
                switch (key) {
                case IpcClient.CLOSE:
                    return () => this.close();
                case "then":
                    return (...args) => Promise.resolve(p).then(...args);
                case "on":
                case "once":
                case "emit":
                    return (...args) => this[key](...args);
                default:
                    return this.#subproxy([key]);
                }
            },
            set: (_, key, val) => this.set([key], val),
            apply: (_, thisArg, args) => this.call([], ...args),
        });
        return p;
    };

    proxy() {
        return this.#proxy();
    }
}

export { IpcHost, IpcClient };
