const path = require('path');
const HtmlWebPackPlugin = require("html-webpack-plugin");
const FaviconsWebpackPlugin = require("favicons-webpack-plugin");
const CompressionPlugin = require("compression-webpack-plugin");
const zlib = require("zlib");

const htmlWebPackPluginOptions = {
    title: "CloudTitan",
    publicPath: "/",
    meta: {
        viewport: "",
    },
    minify: {
        collapseWhitespace: true,
        keepClosingSlash: true,
        removeComments: true,
        removeRedundantAttributes: true,
        removeScriptTypeAttributes: true,
        removeStyleLinkTypeAttributes: true,
        useShortDoctype: true,
        minifyCSS: true,
        minifyJS: true,
        minifyURLs: true,
    }
};

module.exports = {
    mode: "development",
    devtool: "source-map",
    entry: {
        main: "./src/index.js",
    },
    output: {
        globalObject: "self",
        path: path.resolve(__dirname, "dist"),
        filename: "[name].[contenthash].bundle.js",
    },
    plugins: [
        new CompressionPlugin({
            algorithm: "gzip",
            threshold: 10240,
            minRatio: 0.8,
        }),
        new CompressionPlugin({
            algorithm: "brotliCompress",
            compressionOptions: {
                params: {
                    [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
                },
            },
            threshold: 10240,
            minRatio: 0.8,
        }),
        new FaviconsWebpackPlugin({
            prefix: "assets/[contenthash:8]/",
            logo: "./favicon.svg",
            inject: true,
        }),
        new HtmlWebPackPlugin({
            ...htmlWebPackPluginOptions,
            filename: "index.html",
        }),
    ],
    module: {
        rules: [{
            test: /\.styl$/,
            use: ["style-loader", "css-loader", "stylus-loader"],
        }, {
            test: /\.css$/,
            use: ["style-loader", "css-loader"]
        }, {
            test: /\.(ttf|woff2?)$/,
            type: "asset/resource"
        }, {
            test: /\.svg$/,
            type: "asset/source"
        }, {
            test: /\.html?$/,
            type: "asset/source"
        }]
    },
    devServer: {
        allowedHosts: "all",
        port: 8088,
        client: {
            overlay: true,
            webSocketURL: "auto://0.0.0.0:0/ws",
        },
    }
};