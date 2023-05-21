const path = require("path");
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: "./authorizer/index.ts",
  mode: "production",
  output: {
    libraryTarget: "commonjs2",
    path: path.resolve(__dirname, "../dist"),
    filename: "index.js",
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  target: 'node',
  externals: [ nodeExternals() ],
};
