const path = require("path");

module.exports = {
  entry: "./users/index.ts",
  mode: "production",
  output: {
    libraryTarget: "commonjs",
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
};
