const path = require("path")
module.exports = {
    mode: "production",
    entry: "./renderer",
    output: {
        path: path.join(__dirname, "public"),
        filename: "bundle.js"
    },
    devtool: "source-map",
    externals: {
        electron: "electron"
    },
    externalsType: "commonjs",
}