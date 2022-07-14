import { LitElement, css, html } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import auth from "./utils/Auth.js";
import favicon from "../favicon.svg";

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

        #auth-content {
            display: grid;
            justify-items: center;
            align-items: center;
            align-self: center;
            justify-self: center;
            grid-gap: 50px;
        }

        #brand {
            display: grid;
            grid-template-columns: auto;
            grid-template-rows: auto auto;
            align-items: center;
            justify-items: center;
            grid-gap: 0px;
        }

        #brand svg {
            width: 160px;
            height: 160px;
        }

        #title {
            font-size: 40px;
            font-weight: bold;
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
                <div id="auth-content">
                    <div id="brand">
                        ${unsafeHTML(favicon)}
                        <div id="title">
                            CloudTitan
                        </div>
                    </div>
                    <cloudtitan-login></cloudtitan-login>
                </div>
            `;
        }

        return html`
            <cloudtitan-main></cloudtitan-main>
        `;
    }
}

customElements.define("cloudtitan-app", CloudtitanApp);
