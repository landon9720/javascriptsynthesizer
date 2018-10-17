import prettyBytes from 'pretty-bytes'
import { samplesPerFrame } from './buffer'
import _ from 'lodash'
import prettyMs from 'pretty-ms'

const stats = {}
const t0 = new Date()

export function incr(metricName, amount = 1) {
    console.assert(_.isString(metricName), 'incr metricName must be string')
    if (!_.has(stats, metricName)) {
        stats[metricName] = 0
    }
    stats[metricName] += amount
}

export function printStats() {
    if (_.isEmpty(stats)) {
        return
    }
    const extendedStats = Object.assign({
        'runtime': (new Date()) - t0
    }, stats)
    _.forEach(extendedStats, (s, k) => {
        if (k.indexOf('frames') >= 0) {
            const frames = Number(s).toLocaleString()
            const samples = Number(s * samplesPerFrame).toLocaleString()
            const bytes = prettyBytes(s * samplesPerFrame * 4)
            s = `${frames} frames ${samples} samples ${bytes}`
        }
        if (k.indexOf('time') >= 0) {
            s = prettyMs(s)
        }
        console.log(`${k}=${s}`)
    })
}
