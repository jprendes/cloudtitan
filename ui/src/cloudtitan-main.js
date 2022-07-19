import { LitElement, css, html } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import auth from "./utils/Auth.js";
import favicon from "../favicon.svg";

import "@spectrum-web-components/progress-circle/sp-progress-circle.js";
import "./components/cloudtitan-login.js";
import "./components/cloudtitan-token-list.js";
import "./components/cloudtitan-downloads.js";
import "./components/cloudtitan-usage.js";

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
            grid-template-columns: 40px 1fr auto auto;
            grid-template-rows: 100%;
            padding: 10px 20px;
            grid-gap: 10px;
        }

        #title {
            font-size: 25px;
            font-weight: bold;
            align-self: center;
        }

        #body {
            display: grid;
            grid-template-columns: 100%;
            grid-template-rows: auto auto minmax(0,1fr);
            align-items: stretch;
            justify-items: center;
        }

        #tokens, #downloads, #usage {
            width: 100%;
            max-width: 580px;
            padding: 10px;
        }

        #download-client {
            align-self: center;
        }

        mwc-icon {
            --mdc-icon-size: 16px;
        }

        #dl-title {
            font-size: 1.2em;
            font-weight: bold;
            height: 44px;
            display: grid;
            align-items: center;
            border-bottom: 1px solid #b3b3b3;
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
    #downloadClient = () => {
        window.open("/dl/cloudtitan");
    };

    // eslint-disable-next-line class-methods-use-this
    render() {
        return html`
            <div id="content">
                <div id="header">
                    ${unsafeHTML(favicon)}
                    <div id="title">CloudTitan</div>
                    <cloudtitan-login></cloudtitan-login>
                </div>
                <div id="body">
                    <cloudtitan-usage id="usage"></cloudtitan-usage>
                    <!--<cloudtitan-downloads id="downloads"></cloudtitan-downloads>-->
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
