import cliArgs from "command-line-args";
import cliUsage from "command-line-usage";

const { stdout } = process;

const options = [{
    name: "host",
    alias: "H",
    type: String,
    typeLabel: "{underline address}",
    description: "The address of the cloudtitan server.",
}, {
    name: "auth-token",
    alias: "t",
    type: String,
    typeLabel: "{underline token}",
    description: "Your identification token.",
}, {
    name: "help",
    alias: "h",
    type: Boolean,
    description: "This help message.",
}, {
    name: "no-tls",
    type: Boolean,
    description: "Disable TLS in the network connection.",
}, {
    name: "self-signed",
    type: Boolean,
    description: "Accept self signed certificates from TLS servers.",
}];

function parse() {
    const opts = cliArgs(options, { camelCase: true });

    opts.authToken = opts.authToken || process.env.AUTH_TOKEN;
    opts.host = opts.host || process.env.CLOUDTITAN_HOST;

    if (opts.noTls) {
        opts.host = opts.host && `ws://${opts.host}`;
    } else {
        opts.host = opts.host && `wss://${opts.host}`;
    }

    return opts;
}

function usage() {
    console.log(cliUsage([{
        header: "Cloudtitan",
        content: "Expose the local CW310 to the cloud",
    }, {
        header: "Options",
        optionList: options,
    }]));
}

export { parse, usage };
