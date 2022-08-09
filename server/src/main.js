import { Command, Option } from "commander";
import { dirname, join, normalize } from "path";
import { fileURLToPath } from "url";

import {
    DEFAULTS,
    ROOT,
} from "./defaults.js";

process.on("unhandledRejection", (error) => {
    console.error("Unhandled Promise Rejection", error);
});

let root;
if (typeof __dirname === "undefined") {
    root = normalize(join(dirname(fileURLToPath(import.meta.url)), ".."));
} else {
    root = normalize(join(__dirname, ".."));
}

const program = new Command();

program
    .name("cloudtitan")
    .description("Run your bitstream and programs in a cloud CW310")
    .version("0.1.0")
    .showSuggestionAfterError(true)
    .allowUnknownOption(false)
    .allowExcessArguments(false);

program
    .requiredOption("-u, --ui <uri>", "URI to the UI", DEFAULTS.ui)
    .requiredOption("-d, --downloads <uri>", "URI to the binary downloads", DEFAULTS.downloads)
    .requiredOption("-b, --database <path>", "Path to the database", DEFAULTS.database)
    .requiredOption("-l, --listen <origin>", "Origin for the server to listen", DEFAULTS.listen)
    .option("-t, --tls", "Enable TLS", DEFAULTS.tls)
    .requiredOption("-g, --gapi <client-id>", "Google auth client-id", DEFAULTS.GAPI_CLIENT_ID)
    .addOption(new Option("--demo").hideHelp().default(DEFAULTS.demo));

program.parse(process.argv);

const opts = program.opts();

if (!("tls" in opts)) {
    opts.tls = opts.listen.startsWith("https://");
}

opts.listen = opts.listen.replace(/^https?:/, "tcp:");

export default opts;

export { ROOT };
