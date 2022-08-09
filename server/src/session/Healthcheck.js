import { readFileSync } from "fs";
import { compress } from "cloudtitan-common/utils/gzip.js";
import { ROOT } from "../main.js";

const bitstreamFilename = "lowrisc_systems_chip_earlgrey_cw310_0.1.bit.orig";
const firmwareFilename = "hello_world_fpga_cw310.bin";

const bitstream = readFileSync(`${ROOT}/assets/${bitstreamFilename}`);
const firmware = readFileSync(`${ROOT}/assets/${firmwareFilename}`);

const binaries = new Map([
    [
        `/working/${bitstreamFilename}`,
        await compress(bitstream),
    ],
    [
        `/working/${firmwareFilename}`,
        await compress(firmware),
    ],
]);

const commands = [
    ["load-bitstream", "/working/lowrisc_systems_chip_earlgrey_cw310_0.1.bit.orig"],
    ["console", "2"],
    ["bootstrap", "/working/hello_world_fpga_cw310.bin"],
    ["console", "2"],
];

export { binaries, commands };
