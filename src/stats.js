const stats = {}

export function incr(metricName, amount = 1) {
    console.assert(_.isString(metricName), 'incr metricName must be string')
    if (!_.has(stats, metricName)) {
        stats[metricName] = 0
    }
    stats[metricName] += amount
}

process.on('exit', () => console.table(_.mapValues(stats, s => Number(s).toLocaleString())))
