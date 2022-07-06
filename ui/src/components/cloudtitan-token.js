import { LitElement, css, html } from "lit";

import redBtnStyle from "../utils/redBtnStyle.js";

import "@spectrum-web-components/action-button/sp-action-button.js";
import "@material/mwc-icon";

class CloudtitanToken extends LitElement {
    static styles = css`
        :host {
            display: grid;
            grid-template-columns: 100%;
            grid-template-rows: 100%;
        }

        #content {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(0, auto);
            grid-gap: 5px;
            padding: 5px;
            height: 25px;
        }

        #content:hover {
            grid-template-columns: minmax(0, auto) minmax(0, 1fr) minmax(0, auto);
        }

        #token {
            display: grid;
            align-items: center;
            font-family: "Roboto Mono", monospace;
            padding: 0 5px;
        }

        #token-text {
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
        }

        #copy {
            margin: -1px;
            margin-left: 0;
        }

        #delete {
            display: none;
        }

        #content:hover #delete {
            display: block;
        }

        mwc-icon {
            --mdc-icon-size: 16px;
        }
    `;

    static properties = {
        token: { type: String },
        feedback: { type: Boolean },
    };

    #copy = () => {
        navigator.clipboard.writeText(this.token);
        this.feedback = true;
    };

    #timeout = null;
    #feedback = false;
    get feedback() { return this.#feedback; }
    set feedback(feedback) {
        if (feedback === this.#feedback) return;
        this.#feedback = feedback;
        clearTimeout(this.#timeout);
        if (feedback) {
            this.#timeout = setTimeout(() => {
                this.#timeout = null;
                this.feedback = false;
            }, 3e3);
        }
        this.requestUpdate();
    }

    render() {
        return html`
            <div id="content">
                <overlay-trigger placement="bottom" offset="0" id="delete">
                    <sp-action-button size="s" slot="trigger" quiet
                        style=${redBtnStyle}
                        quiet
                        emphasized
                        selected
                        @click=${() => this.dispatchEvent(new CustomEvent("delete", { detail: this.token }))}
                    >
                        <mwc-icon slot="icon">delete</mwc-icon>
                    </sp-action-button>
                    <sp-tooltip slot="hover-content">Delete token</sp-tooltip>
                </overlay-trigger>
                <div id="token">
                    <div id="token-text">${this.token}</div>
                </div>
                <overlay-trigger placement="bottom" offset="0" id="copy">
                    <sp-action-button size="s" slot="trigger" quiet
                        @click=${this.#copy}
                    >
                        ${this.feedback ? html`
                            <mwc-icon slot="icon">done</mwc-icon>
                        ` : html`
                            <mwc-icon slot="icon">content_copy</mwc-icon>
                        `}
                    </sp-action-button>
                    <sp-tooltip slot="hover-content">Copy token to clipboard</sp-tooltip>
                </overlay-trigger>
            </div>
        `;
    }
}

customElements.define("cloudtitan-token", CloudtitanToken);
