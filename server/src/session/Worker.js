import { v4 as uuidv4 } from "uuid";
import { IpcClient } from "cloudtitan-common/comm/Ipc.js";

class Worker {
    #sock = null;
    #queue = null;
    #running = false;

    constructor(sock, queue) {
        this.#sock = sock;
        this.#queue = queue;
    }

    get running() {
        return !!this.#running;
    }

    async run() {
        this.#running = this.#running || this.#run();
        return this.#running;
    }

    async #run() {
        const tasks = this.#queue.tasks();
        this.#sock.on("close", () => tasks.abort());

        for await (const task of tasks) {
            try {
                const channel = this.#sock.channel(uuidv4());
                const ipc = new IpcClient(channel);
                await task(ipc.proxy());
                await ipc.close();
            } catch (err) {
                console.error(err);
                this.#queue.unshift(task);
            }
        }

        await null; // Ensure the next line never runs synchronously

        this.#running = null;
    }
}

export default Worker;
