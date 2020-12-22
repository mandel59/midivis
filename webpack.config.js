module.exports = {
    mode: "production",
    entry: "./renderer",
    output: {
        path: __dirname,
        filename: "bundle.js"
    },
    devtool: "source-map",
    externals: {
        electron: "electron"
    },
    externalsType: "commonjs",
}