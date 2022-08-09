import { Command, Option } from "commander";

import run from "./run.js";

import { stderr, write } from "./write.js";

import { DEFAULTS } from "./config.js";

process.on("unhandledRejection", (error) => {
    console.error("Unhandled Promise Rejection", error);
});

const program = new Command();

const command = (f) => async (...args) => {
    const cmd = args.pop();
    args.pop();
    try {
        await f(...args, { ...cmd.optsWithGlobals() });
    } catch (err) {
        write(stderr, "\x1b[1;31m", "Error: ", err.message, "\r\n\x1b[0m");
    }
};

program
    .name("cloudtitan")
    .description("Share your CW310 FGPA in the cloud")
    .version("0.1.0")
    .showSuggestionAfterError(true)
    .allowUnknownOption(false)
    .allowExcessArguments(false);

program
    .requiredOption("-a, --auth-token <token>", "Your identification token", DEFAULTS.authToken)
    .requiredOption("-H, --host <host>", "The address of the cloudtitan server", DEFAULTS.host)
    .option("--no-tls", "Disable TLS in the network connection", DEFAULTS.tls)
    .option("--self-signed", "Accept self signed certificates from TLS servers", DEFAULTS.selfSigned)
    .addOption(new Option("--demo").hideHelp().default(DEFAULTS.demo))
    .action(command(run));

await program.parseAsync(process.argv);
