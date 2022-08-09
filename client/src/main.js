import { Command } from "commander";

import run from "./run.js";
import open from "./open.js";
import list from "./list.js";
import remove from "./remove.js";

import { stderr, COLORS } from "./write.js";

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
        stderr.color(COLORS.RED).bold().println(`Error: ${err.message}`);
    }
};

program
    .name("cloudtitan")
    .description("Run your bitstream and programs in a cloud CW310")
    .version("0.1.0")
    .showSuggestionAfterError(true)
    .allowUnknownOption(false)
    .allowExcessArguments(false);

program
    .requiredOption("-a, --auth-token <token>", "Your identification token", DEFAULTS.authToken)
    .requiredOption("-H, --host <host>", "The address of the cloudtitan server", DEFAULTS.host)
    .option("--no-tls", "Disable TLS in the network connection", DEFAULTS.tls)
    .option("--self-signed", "Accept self signed certificates from TLS servers", DEFAULTS.selfSigned);

program.command("run")
    .description("Run a session in a cloudtitan server")
    .option("-b, --bitstream <bitstream>", "The bitstream to load in the FPGA", DEFAULTS.bitstream)
    .option("-t, --timeout <seconds>", "Stop session after <seconds> without activity.", DEFAULTS.timeout, parseInt)
    .argument("[firmware[@offset] ...]", "The firmware file to load in the FPGA")
    .action(command(run));

program.command("open")
    .description("Open one of your existing sessions")
    .argument("session-id", "Id of the session to open")
    .action(command(open));

program.command("list")
    .description("List sessions")
    .action(command(list));

program.command("remove")
    .description("Remove sessions from the server")
    .option("--all", "Remove all sessions")
    .argument("[session-id ...]", "Id of a session to remove")
    .action(command(remove));

await program.parseAsync(process.argv);
