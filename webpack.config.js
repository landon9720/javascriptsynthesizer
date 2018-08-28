const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
    entry: ['./src/index.js', 'babel-polyfill'],
    output: {
        filename: './index.js',
        path: path.resolve(__dirname, 'dist'),
    },
    plugins: [
    ],
    resolve: {
        extensions: ['.js', '.json'],
    },
    module: {
        loaders: [
            {
                test: /\.(js|jsx)$/,
                exclude: /(node_modules)/,
                loader: 'babel-loader',
            },
        ],
    },
    node: {
        fs: 'empty',
    },
    devtool: 'eval-source-map',
    target: 'node',
}
