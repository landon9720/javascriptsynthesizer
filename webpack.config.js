const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
    entry: './src/index.js',
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
            },
            {
                test: /\.css$/,
                loader: 'style-loader!css-loader',
            },
        ],
    },
    node: {
        fs: 'empty',
    },
    devtool: 'eval-source-map',
}
