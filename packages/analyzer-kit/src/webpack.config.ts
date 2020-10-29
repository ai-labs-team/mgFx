import { resolve } from 'path';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import {
  Configuration,
  DefinePlugin,
  HotModuleReplacementPlugin,
} from 'webpack';
import ReactRefreshPlugin from '@pmmmwh/react-refresh-webpack-plugin';

const isDevelopment = process.env.NODE_ENV === 'development';

const mainEntry = resolve(__dirname, 'ui', 'index.tsx');

const config: Configuration = {
  mode: isDevelopment ? 'development' : 'production',
  entry: {
    main: isDevelopment
      ? ['webpack-hot-middleware/client', mainEntry]
      : mainEntry,
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          isDevelopment &&
            ({
              loader: 'babel-loader',
              options: {
                plugins: [
                  'react-refresh/babel',
                  '@babel/plugin-syntax-import-meta',
                ],
              },
            } as any),
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.ui.json',
            },
          },
        ].filter(Boolean),
      },
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
      },
    ],
  },
  plugins: [
    isDevelopment && (new HotModuleReplacementPlugin() as any),
    isDevelopment &&
      (new ReactRefreshPlugin({
        overlay: {
          sockIntegration: 'whm',
        },
      }) as any),
    new HtmlWebpackPlugin({
      template: resolve(__dirname, 'ui', 'index.html'),
    }),
    new DefinePlugin({
      'process.env': {},
    }),
  ].filter(Boolean),
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: '[name].bundle.js',
    path: resolve(__dirname, '..', 'dist', 'ui'),
    publicPath: '/',
  },
};

module.exports = config;
