import { LitElement, css, html } from "lit";

import auth from "./utils/Auth.js";

import "./components/cloudtitan-login.js";
import "./components/cloudtitan-error.js";
import "./cloudtitan-main.js";

class CloudtitanApp extends LitElement {
    static styles = css`
        :host {
            display: grid;
            grid-template-columns: 100%;
            grid-template-rows: 100%;
            width: 100%;
            height: 100%;
        }
    `;

    constructor() {
        super();
        auth.on("change", this.#requestUpdate);
        this.#requestUpdate();
    }

    #requestUpdate = () => {
        this.requestUpdate();
    };

    // eslint-disable-next-line class-methods-use-this
    render() {
        if (!auth.authorized) {
            return html`
                <cloudtitan-login></cloudtitan-login>
            `;
        }

        return html`
            <cloudtitan-main></cloudtitan-main>
        `;
    }
}

customElements.define("cloudtitan-app", CloudtitanApp);
