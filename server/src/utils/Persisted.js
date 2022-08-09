import uuid from "cloudtitan-common/utils/uuid.js";

export default (db, BaseClass = Object) => {
    const byId = new Map();

    class Persisted extends BaseClass {
        static async byId(id) {
            if (byId.has(id)) return byId.get(id);
            const args = await db.get(id);
            if (!args) return null;
            const value = new this({ id }, ...args);
            return value;
        }

        static async new(...args) {
            let id = await uuid();
            // eslint-disable-next-line no-await-in-loop
            while (await this.byId(id)) {
                // eslint-disable-next-line no-await-in-loop
                id = await uuid();
            }

            byId.set(id, null); // reserve the value

            const value = new this({ id }, ...args);
            await value.save();
            return value;
        }

        #id = null;

        constructor({ id }, ...forward) {
            super(...forward);

            this.#id = id;

            byId.set(id, this);
        }

        get id() { return this.#id; }

        save(...args) {
            if (this.save === Persisted.prototype.save) {
                // the function hasn't been overridden,
                // we expect no arguments
                args = [this];
            }
            return db.set(this.#id, args);
        }

        delete() {
            byId.delete(this.#id);
            return db.delete(this.id);
        }
    }

    return Persisted;
};
