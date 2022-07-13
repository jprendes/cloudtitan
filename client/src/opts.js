import cliArgs from "command-line-args";
import cliUsage from "command-line-usage";

const { stdout } = process;

const options = [{
    name: "bitstream",
    alias: "b",
    type: String,
    typeLabel: "{underline file}",
    description: "The bitstream to load in the FPGA.",
}, {
    name: "firmware",
    alias: "f",
    multiple: true,
    type: String,
    typeLabel: "{underline file[@offset]}",
    description: "The firmware file to load in the FPGA.",
}, {
    name: "timeout",
    alias: "t",
    type: Number,
    typeLabel: "{underline seconds}",
    description: "Stop session after [seconds] without activity.",
}, {
    name: "host",
    alias: "H",
    type: String,
    typeLabel: "{underline address}",
    description: "The address of the cloudtitan server.",
}, {
    name: "auth-token",
    alias: "a",
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
    let opts = cliArgs(options, { camelCase: true });

    opts = {
        authToken: process.env.AUTH_TOKEN,
        host: process.env.CLOUDTITAN_HOST,
        timeout: 2,
        ...opts,
    }

    if (opts.noTls) {
        opts.host = opts.host && `ws://${opts.host}`;
    } else {
        opts.host = opts.host && `wss://${opts.host}`;
    }

    opts.firmware = (opts.firmware || []).map((fw) => {
        const [path, offset = -1] = fw.split(/@(\d+)$/);
        if (offset === -1) {
            return [path];
        }
        return [path, parseInt(offset, 10)];
    });

    if (opts.firmware.length > 1) {
        for (const [path, offset] of opts.firmware) {
            if (offset < 0) {
                console.error(`Firmware file "${path}" requires an offset.`);
                process.exit(1);
            }
        }
    }

    return opts;
}

function usage() {
    console.log(cliUsage([{
        header: "Cloudtitan",
        content: "Run your bitstream and programs in a cloud CW310",
    }, {
        header: "Options",
        optionList: options,
    }]));
}

export { parse, usage };
