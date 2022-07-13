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
            grid-template-columns: 1fr auto auto;
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
            grid-template-rows: 100%;
            align-items: stretch;
            justify-items: center;
        }

        #tokens {
            width: 100%;
            max-width: 500px;
            padding: 10px;
        }

        #download-client {
            align-self: center;
        }

        mwc-icon {
            --mdc-icon-size: 16px;
        }
    `;

    constructor() {
        super();
        auth.on("tokens", this.#requestUpdate);
    }

    #requestUpdate = () => {
        this.requestUpdate();
    };

    #downloadClient = () => {
        window.open("/dl/cloudtitan");
    }

    // eslint-disable-next-line class-methods-use-this
    render() {
        return html`
            <div id="content">
                <div id="header">
                    <div id="title">CloudTitan</div>
                    <overlay-trigger placement="bottom" offset="0" id="download-client">
                        <sp-action-button size="s" quiet slot="trigger"
                            quiet
                            emphasized
                            selected
                            @click=${this.#downloadClient}
                        >
                            <mwc-icon slot="icon">cloud_download</mwc-icon>
                            client
                        </sp-action-button>
                        <sp-tooltip slot="hover-content">Download cloudtitan client</sp-tooltip>
                    </overlay-trigger>
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
