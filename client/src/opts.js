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
    name: "host",
    alias: "H",
    type: String,
    typeLabel: "{underline address}",
    description: "The address of the cloudtitan server.",
}, {
    name: "no-tls",
    type: Boolean,
    description: "Disable TLS in the network connection.",
}, {
    name: "progress",
    alias: "p",
    type: (val) => ["1", "true", "on", "t", "y", "yes"].includes(val.toLowerCase()),
    typeLabel: "{underline on|off}",
    description: "Enable or disable the progressbar for queueing, loading bitstream and firmware.\nDefaults to true if the output is a TTY.",
}, {
    name: "queue",
    alias: "q",
    type: (val) => ["1", "true", "on", "t", "y", "yes"].includes(val.toLowerCase()),
    typeLabel: "{underline on|off}",
    description: "Enable or disable showing the job positing in the job queue.\nDefaults to the value of the progress option.",
}, {
    name: "selfsigned",
    alias: "s",
    type: Boolean,
    description: "Accept self signed certificates from TLS servers.",
}];

function parse() {
    const opts = cliArgs(options, { camelCase: true });

    if (![true, false].includes(opts.progress)) {
        opts.progress = stdout.isTTY;
    }

    if (![true, false].includes(opts.queue)) {
        opts.queue = opts.progress;
    }

    opts.authToken = opts.authToken || process.env.AUTH_TOKEN;
    opts.host = opts.host || process.env.CLOUDTITAN_HOST;

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
