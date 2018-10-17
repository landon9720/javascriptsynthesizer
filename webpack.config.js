const path = require('path')

module.exports = {
    mode: 'development',
    entry: ['./src/index.js', 'babel-polyfill'],
    output: {
        filename: './index.js',
        path: path.resolve(__dirname, 'dist'),
    },
    target: 'node',
    node: {
        fs: 'empty',
    },
    devtool: 'source-map',
    stats: 'minimal',
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                        plugins: ['@babel/plugin-proposal-class-properties']
                    }
                }
            }
        ]
    }
}
