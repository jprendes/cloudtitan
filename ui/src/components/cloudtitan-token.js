import { LitElement, css, html } from "lit";

import redBtnStyle from "../utils/redBtnStyle.js";

import "@spectrum-web-components/icons-workflow/icons/sp-icon-paste.js";
import "@spectrum-web-components/icons-workflow/icons/sp-icon-checkmark.js";
import "@spectrum-web-components/icons-workflow/icons/sp-icon-delete.js";
import "@spectrum-web-components/action-button/sp-action-button.js";

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
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            display: grid;
            align-items: center;
            font-family: monospace;
            padding: 0 5px;
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
                        <sp-icon-delete slot="icon" size="s"></sp-icon-delete>
                    </sp-action-button>
                    <sp-tooltip slot="hover-content">Delete token</sp-tooltip>
                </overlay-trigger>
                <div id="token">
                    ${this.token}
                </div>
                <overlay-trigger placement="bottom" offset="0" id="copy">
                    <sp-action-button size="s" slot="trigger" quiet
                        @click=${this.#copy}
                    >
                        ${this.feedback ? html`
                            <sp-icon-checkmark slot="icon" size="s"></sp-icon-checkmark>
                        ` : html`
                            <sp-icon-paste slot="icon" size="s"></sp-icon-paste>
                        `}
                    </sp-action-button>
                    <sp-tooltip slot="hover-content">Copy token to clipboard</sp-tooltip>
                </overlay-trigger>
            </div>
        `;
    }
}

customElements.define("cloudtitan-token", CloudtitanToken);
