import { LitElement, css, html } from "lit";

import auth from "./utils/Auth.js";

import "@spectrum-web-components/progress-circle/sp-progress-circle.js";
import "./components/cloudtitan-login.js";
import "./components/cloudtitan-token-list.js";

class CloudtitanMain extends LitElement {
    static styles = css`
        :host {
            display: grid;
            grid-template-columns: 100%;
            grid-template-rows: 100%;
        }

        #content {
            display: grid;
            grid-template-columns: 100%;
            grid-template-rows: auto minmax(0, 1fr);
        }

        #header {
            display: grid;
            grid-template-columns: 1fr auto;
            grid-template-rows: 100%;
            padding: 10px 20px;
        }

        #title {
            font-size: 25px;
            font-weight: bold;
            align-self: center;
        }

        #body {
            display: grid;
            grid-template-columns: 100%;
            grid-template-rows: 100%;
            align-items: stretch;
            justify-items: center;
        }

        #tokens {
            width: 100%;
            max-width: 500px;
            padding: 10px;
        }
    `;

    constructor() {
        super();
        auth.on("tokens", this.#requestUpdate);
    }

    #requestUpdate = () => {
        this.requestUpdate();
    };

    // eslint-disable-next-line class-methods-use-this
    render() {
        return html`
            <div id="content">
                <div id="header">
                    <div id="title">CloudTitan</div>
                    <cloudtitan-login></cloudtitan-login>
                </div>
                <div id="body">
                    <cloudtitan-token-list
                        id="tokens"
                        .tokens=${auth.tokens}
                        @delete=${({ detail: token }) => auth.remToken(token)}
                        @create=${() => auth.newToken()}
                    ></cloudtitan-token-list>
                </div>
            </div>
        `;
    }
}

customElements.define("cloudtitan-main", CloudtitanMain);
