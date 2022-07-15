import { LitElement, css, html } from "lit";

import "@spectrum-web-components/overlay/overlay-trigger.js";
import "@spectrum-web-components/tooltip/sp-tooltip.js";
import "@spectrum-web-components/action-button/sp-action-button.js";
import "@material/mwc-icon";

class CloudtitanDownloadBtn extends LitElement {
    static styles = css`
        mwc-icon {
            --mdc-icon-size: 20px;
        }
    `;

    static properties = {
        href: { type: String },
        tooltip: { type: String },
    };

    #download = () => {
        window.open(this.href, "_blank");
    };

    render() {
        return html`
            <overlay-trigger placement="bottom" offset="0" id="download-client">
                <sp-action-button size="m" quiet slot="trigger"
                    quiet
                    emphasized
                    selected
                    @click=${this.#download}
                >
                    <mwc-icon slot="icon">cloud_download</mwc-icon>
                    <slot></slot>
                </sp-action-button>
                <sp-tooltip slot="hover-content">${this.tooltip}</sp-tooltip>
            </overlay-trigger>
        `;
    }
}

customElements.define("cloudtitan-download-btn", CloudtitanDownloadBtn);
