const { resolve: _resolve } = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TSConfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

const resolve = (...paths) =>
  _resolve(__dirname, ...paths);

module.exports = {
  entry: resolve('index.tsx'),
  module: {
    rules: [{
      test: /.js$/,
      use: 'source-map-loader',
      enforce: 'pre',
    }, {
      test: /.tsx?$/,
      exclude: /node_modules/,
      loader: 'ts-loader',
      options: {
        configFile: resolve('tsconfig.json')
      }
    }]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    plugins: [
      new TSConfigPathsPlugin({
        configFile: resolve('tsconfig.json')
      })
    ],
  },
  output: {
    filename: 'bundle.js',
    path: resolve('..', '..', 'dist', 'ui'),
    publicPath: '/'
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'mgFx Inspector',
      template: resolve('index.html')
    })
  ]
};
