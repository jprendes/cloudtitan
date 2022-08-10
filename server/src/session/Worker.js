import Owner from "cloudtitan-common/events/Owner.js";
import Session from "./Session.js";

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

    async #runSession(session) {
        try {
            let { id } = session;
            if (id !== "healthcheck") {
                id = Buffer.from(session.id, "binary").toString("base64url");
            }
            const chann = this.#sock.channel(id);
            return await session.run(chann);
        } catch (err) {
            console.error("Worker failed task");
            console.error(err);
            return false;
        }
    }

    async #runHealthcheck() {
        const session = await Session.byId("healthcheck");
        const success = await this.#runSession(session);
        if (!success) {
            for (const [,, chunk] of session.history) {
                process.stderr.write("  > ");
                process.stderr.write(chunk);
            }
        }
        return success;
    }

    async #run() {
        console.log("Running health check.");
        if (!await this.#runHealthcheck()) {
            // Health check failed.
            console.error("Worker failed health check");
            if (this.#sock.closed) return;

            // Wait a while, and then close connection.
            // This is to avoid fast reconnects.
            await Owner.timeout(300e3);
            if (this.#sock.closed) return;

            this.#sock.close(1011, "Failed healthcehck");
            return;
        }
        console.log("Health check passed.");

        const tasks = this.#queue.tasks();
        this.#sock.on("close", () => tasks.abort());

        for await (const session of tasks) {
            const success = await this.#runSession(session);
            if (!success) {
                this.#queue.unshift(session);
            }
        }

        await null; // Ensure the next line never runs synchronously

        this.#running = null;
    }
}

export default Worker;
