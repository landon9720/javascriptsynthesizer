const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
    entry: './index.js',
    output: {
        filename: './index.js',
        path: path.resolve(__dirname, 'dist'),
    },
    plugins: [
        new CopyWebpackPlugin([
            { from: './index.html', to: 'index.html' },
        ]),
    ],
    resolve: {
        extensions: ['.js', '.json', '.jsx', '.css'],
    },
    module: {
        loaders: [
            {
                test: /\.(js|jsx)$/,
                exclude: /(node_modules)/,
                loader: 'babel-loader',
            }
        ],
    },
    node: {
        fs: 'empty',
    },
    devtool: 'eval-source-map',
}
