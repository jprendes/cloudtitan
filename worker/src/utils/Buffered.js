import Evented from "cloudtitan-common/events/Evented.js";

class Buffered extends Evented {
    #data = "";

    push(data) {
        data = `${this.#data}${data.toString()}`;
        // eslint-disable-next-line no-control-regex
        data = data.split(/(\x1b\[[0-9;]*[^0-9;]|[\x00-\x1a\x1c\x1f])/g);
        this.#data = data.pop();
        data = data.join("");
        this.emit("data", data);
    }

    flush() {
        if (this.#data === "") return;
        this.emit("data", this.#data);
        this.#data = "";
    }

    destroy() {
        this.flush();
        super.destroy();
    }
}

export default Buffered;
