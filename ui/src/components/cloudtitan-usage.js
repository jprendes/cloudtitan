import { LitElement, css, html } from "lit";

class CloudtitanUsage extends LitElement {
    static styles = css`
        :host {
            display: grid;
            grid-template-columns: 100%;
            grid-template-rows: 100%;
        }

        #content {
            display: grid;
            grid-template-rows: auto minmax(0, 1fr);
            grid-template-columns: minmax(0, 100%);
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
        }

        ul.code {
            background: #444;
            color: #eee;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
            font-family: monospace;
            font-size: 0.8em;
            overflow: auto;
        }

        ul.code > li {
            list-style: none;
            margin: 0;
            padding: 0;
            white-space: nowrap;
            width: fit-content;
        }

        ul.code > li:before {
            content: "$";
            padding-right: 0.2em;
            font-weight: bold;
        }

        ul.code {
            scrollbar-color:
                var(--scrollbar-foreground, #ccc)
                var(--scrollbar-background, transparent);
        }
        
        ul.code::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }

        ul.code::-webkit-scrollbar-thumb {
            background: var(--scrollbar-foreground, #ccc);
        }
        
        ul.code::-webkit-scrollbar-track {
            background: var(--scrollbar-backgroundm, transparent);
        }
    `;

    // eslint-disable-next-line class-methods-use-this
    render() {
        return html`
            <div id="content">
                <div id="header">
                    <div id="title">Usage</div>
                </div>
                <div id="body">
                    <ul class="code">
                        <li>curl -o- ${document.location.origin}/dl/cloudtitan > cloudtitan</li>
                        <li>chmod a+x cloudtitan</li>
                        <li>./cloudtitan -h</li>
                        <li>./cloudtitan -a $AUTH_TOKEN -b /my/bitstream -f /my/firmware</li>
                    </ul>
                </div>
            </div>
        `;
    }
}

customElements.define("cloudtitan-usage", CloudtitanUsage);
