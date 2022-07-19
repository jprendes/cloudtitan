import { LitElement, css, html } from "lit";

import "@spectrum-web-components/action-button/sp-action-button.js";
import "@material/mwc-icon";
import "./cloudtitan-token.js";

class CloudtitanTokenList extends LitElement {
    static styles = css`
        :host {
            display: grid;
            grid-template-columns: 100%;
            grid-template-rows: 100%;
        }

        cloudtitan-token {
            border-bottom: 1px dashed var(--spectrum-alias-component-border-color-selected-default);
        }

        cloudtitan-token:first-child {
            border-top: 1px solid var(--spectrum-alias-component-border-color-selected-default);
        }

        cloudtitan-token:last-child {
            border-bottom: 1px solid var(--spectrum-alias-component-border-color-selected-default);
        }

        cloudtitan-token:hover {
            background-color: var(--spectrum-alias-component-background-color-selected-default);
        }

        #content {
            display: grid;
            grid-template-rows: auto minmax(0, 1fr);
            height: 100%;
        }

        #create {
            margin: 10px 5px;
        }

        #empty {
            box-sizing: border-box;
            height: 37px;
            width: 100%;
            color: var(--spectrum-alias-component-border-color-selected-default);
            border: 1px solid var(--spectrum-alias-component-border-color-selected-default);
            border-left: none;
            border-right: none;
            display: grid;
            align-content: center;
            justify-content: center;
        }

        #title {
            font-size: 1.2em;
            font-weight: bold;
        }

        #header {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: center;
        }

        #token-list {
            overflow: auto;
        }

        #token-list {
            scrollbar-color:
                var(--scrollbar-foreground, #ccc)
                var(--scrollbar-background, transparent);
        }
        
        #token-list::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }

        #token-list::-webkit-scrollbar-thumb {
            background: var(--scrollbar-foreground, #ccc);
        }
        
        #token-list::-webkit-scrollbar-track {
            background: var(--scrollbar-backgroundm, transparent);
        }

        mwc-icon {
            --mdc-icon-size: 16px;
        }
    `;

    static properties = {
        tokens: { type: Object },
    };

    render() {
        let tokenList = html`<div id="empty">Empty</div>`;

        if (this.tokens && this.tokens.length > 0) {
            tokenList = this.tokens.map((token) => html`
                <cloudtitan-token
                    token=${token}
                    @delete=${({ detail }) => this.dispatchEvent(new CustomEvent("delete", { detail }))}
                ></cloudtitan-token>
            `);
        }
        return html`
            <div id="content">
                <div id="header">
                    <div id="title">Auth tokens</div>
                    <overlay-trigger placement="bottom" offset="0" id="create">
                        <sp-action-button size="s" slot="trigger" quiet
                            quiet
                            emphasized
                            selected
                            @click=${() => this.dispatchEvent(new CustomEvent("create"))}
                        >
                            <mwc-icon slot="icon">add</mwc-icon>
                        </sp-action-button>
                        <sp-tooltip slot="hover-content">Create new token</sp-tooltip>
                    </overlay-trigger>
                </div>
                <div id="token-list">${tokenList}</div>
            </div>
        `;
    }
}

customElements.define("cloudtitan-token-list", CloudtitanTokenList);
