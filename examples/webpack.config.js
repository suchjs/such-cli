const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { port, prefix } = require('./config');
module.exports = {
  entry: "./src/index.js",
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist"),
  },
  devServer: {
    hot: true,
    host: '0.0.0.0',
    port: 9292,
    static: ['dist'],
    proxy: {
      [prefix]: {
        target: `http://localhost:${port}`,
        secure: false
      },
      '/list': {
        target: `http://localhost:${port}`,
        secure: false
      }
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "src/index.html",
    }),
  ],
};
