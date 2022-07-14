import { html, render } from "lit";

import "@spectrum-web-components/styles/all-medium-lightest.css";
import "@spectrum-web-components/theme/sp-theme.js";
import "@fontsource/roboto";
import "@fontsource/roboto-mono";
import "@fontsource/material-icons";

import "./cloudtitan-app.js";

render(html`
    <style>
        html,
        body {
            display: grid;
            grid-template-columns: 100% 0;
            grid-template-rows: 100% 0;
            width: 100%;
            height: 100%;
            min-width: 640px;
            min-height: 480px;
            padding: 0;
            margin: 0;
            overflow: auto;
            background: #f3f3f3;
            font-family: "Roboto", sans-serif
        }
        sp-theme {
            display: contents;
        }
        active-overlay,
        sp-tooltip {
            max-width: none !important;
        }
    </style>
    <sp-theme scale="medium" color="lightest">
        <cloudtitan-app></cloudtitan-app>
    </sp-theme>
`, document.body);
