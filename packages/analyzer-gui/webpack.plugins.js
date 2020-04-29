const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const WorkerPlugin = require('worker-plugin');

module.exports = [
  new ForkTsCheckerWebpackPlugin(),
  new WorkerPlugin({ preserveTypeModule: true }),
];
