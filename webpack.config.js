const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = {
    entry: {
        index: './src/index.js',
        audioworklet: './src/audioworklet.js',
        server: './src/server.js',
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
    },
    plugins: [new CopyWebpackPlugin([{ from: './index.html', to: 'index.html' }])],
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
        net: 'empty',
    },
    devtool: 'eval-source-map',
    target : 'node',
}
