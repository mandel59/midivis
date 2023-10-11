const path = require("path")
const HtmlWebpackPlugin = require("html-webpack-plugin")
module.exports = [
    {
        mode: "production",
        entry: "./src/renderer",
        output: {
            path: path.join(__dirname, "public"),
            publicPath: "/",
            filename: "bundle.js",
            assetModuleFilename: '[name][ext][query]',
        },
        devtool: "source-map",
        externalsType: "commonjs",
        module: {
            rules: [
                {
                    test: /\.html$/,
                    use: {
                        loader: "html-loader"
                    }
                },
                {
                    test: /\.css$/,
                    type: "asset/resource",
                },
                {
                    test: /\.png$/,
                    type: "asset/resource",
                    generator: {
                        filename: 'icons/[name][ext][query]',
                    },
                },
                {
                    test: /\.xpi$/,
                    type: "asset/resource",
                },
                {
                    test: /\.webmanifest$/,
                    type: "asset/resource",
                },
            ],
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: "./src/public/index.html",
                filename: "index.html",
                scriptLoading: "defer",
            })
        ],
    },
    {
        mode: "production",
        entry: "./src/show-licenses",
        output: {
            path: path.join(__dirname, "public"),
            filename: "show-licenses.js"
        },
        module: {
            rules: [
                {
                    test: /license$/i,
                    type: "asset/source",
                },
                {
                    test: /\.html$/,
                    use: "html-loader"
                },
            ],
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: "./src/public/about.html",
                filename: "about.html",
                scriptLoading: "defer",
            })
        ],
    },
    {
        mode: "production",
        entry: "./src/service-worker",
        output: {
            path: path.join(__dirname, "public"),
            filename: "service-worker.js"
        },
    },
]