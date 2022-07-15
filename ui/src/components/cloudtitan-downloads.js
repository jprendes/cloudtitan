import { LitElement, css, html } from "lit";

import "./cloudtitan-download-btn.js";

class CloudtitanDownloads extends LitElement {
    static styles = css`
        :host {
            display: grid;
            grid-template-columns: 100%;
            grid-template-rows: 100%;
        }

        #content {
            display: grid;
            grid-template-rows: auto minmax(0, 1fr);
            height: 100%;
        }

        #title {
            font-size: 1.2em;
            font-weight: bold;
        }

        #header {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: center;
            height: 44px;
            border-bottom: 1px solid var(--spectrum-alias-component-border-color-selected-default);
        }

        #body {
            padding: 10px;
            display: grid;
            grid-template-columns: auto auto;
            justify-content: space-evenly;
            border-bottom: 1px solid var(--spectrum-alias-component-border-color-selected-default);
        }
    `;

    // eslint-disable-next-line class-methods-use-this
    render() {
        return html`
            <div id="content">
                <div id="header">
                    <div id="title">Downloads</div>
                </div>
                <div id="body">
                    <cloudtitan-download-btn href="/dl/cloudtitan" tooltip="Download cloudtitan client">
                        cloudtitan client
                    </cloudtitan-download-btn>
                    <cloudtitan-download-btn href="/dl/cloudtitan-worker" tooltip="Download cloudtitan worker">
                        cloudtitan worker
                    </cloudtitan-download-btn>
                </div>
            </div>
        `;
    }
}

customElements.define("cloudtitan-downloads", CloudtitanDownloads);
