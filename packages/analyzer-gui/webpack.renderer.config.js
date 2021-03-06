const TsConfigPathsWebpackPlugin = require('tsconfig-paths-webpack-plugin');

const rules = require('./webpack.rules');
const plugins = require('./webpack.plugins');

rules.push(
  {
    test: /\.css$/,
    use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
  },
  {
    test: /\.s[ac]ss$/i,
    use: [
      { loader: 'style-loader' },
      { loader: 'css-loader' },
      { loader: 'sass-loader' },
    ],
  }
);

module.exports = {
  module: {
    rules,
  },
  plugins,
  output: {
    chunkFilename: 'main_window/[name].js',
    publicPath: '../',
  },
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
    plugins: [
      new TsConfigPathsWebpackPlugin({ configFile: './tsconfig.json' }),
    ],
    alias: {
      'react-dom': '@hot-loader/react-dom',
    },
  },
};
