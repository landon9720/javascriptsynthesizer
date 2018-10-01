require('babel-polyfill')
require('source-map-support').install()
require('./render')
global.Promise = require('bluebird')


console.assert = (b, msg) => {
    if (!b) {
        console.trace(msg || 'no msg')
    }
}
