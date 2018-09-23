import prettyBytes from 'pretty-bytes'
import { samplesPerFrame } from './buffer'
import _ from 'lodash'

const stats = {}

export function incr(metricName, amount = 1) {
    console.assert(_.isString(metricName), 'incr metricName must be string')
    if (!_.has(stats, metricName)) {
        stats[metricName] = 0
    }
    stats[metricName] += amount
}

process.on('exit', () => {
    if (_.isEmpty(stats)) {
        return
    }
    console.table(_.mapValues(stats, (s, k) => {
        if (k.indexOf('frames') >= 0) {
            const frames = Number(s).toLocaleString()
            const samples = Number(s * samplesPerFrame).toLocaleString()
            const bytes = prettyBytes(s * samplesPerFrame * 4)
            return `${frames} frames ${samples} samples ${bytes}`
        }
        return s
    }))
})
