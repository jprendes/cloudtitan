import { v4 as uuidv4 } from "uuid";
import { IpcClient } from "cloudtitan-common/comm/Ipc.js";
import Owner from "cloudtitan-common/events/Owner.js";
import Api from "./Api.js";

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

    async #runTask(task) {
        try {
            const channel = this.#sock.channel(uuidv4());
            const ipc = new IpcClient(channel);
            try {
                await task(ipc.proxy());
                return true;
            } catch (err) {
                console.error("Worker failed task");
                console.error(err);
                return false;
            } finally {
                await ipc.close();
            }
        } catch (err) {
            console.error("Error with IPC channel.");
            console.error(err);
            return false;
        }
    }

    async #run() {
        if (!await this.#runTask(Api.healthcheck)) {
            // Health check failed.
            // Wait a while, and then close connection.
            // This is to avoid fast reconnects.
            await Owner.timeout(300e3);
            return;
        }

        const tasks = this.#queue.tasks();
        this.#sock.on("close", () => tasks.abort());

        for await (const task of tasks) {
            const success = await this.#runTask(task);
            if (!success) {
                this.#queue.unshift(task);
            }
        }

        await null; // Ensure the next line never runs synchronously

        this.#running = null;
    }
}

export default Worker;
