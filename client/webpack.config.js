import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import webpack from "webpack";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
    target: "node",
    mode: "production",
    entry: "./src/cloudtitan.js",
    node: {
        __dirname: false,
    },
    output: {
        filename: "cloudtitan.js",
        path: resolve(__dirname, "build"),
        chunkFormat: "commonjs",
    },
    experiments: {
        topLevelAwait: true,
    },
    plugins: [
        new webpack.optimize.LimitChunkCountPlugin({
            maxChunks: 1,
        }),
    ],
};
