import _ from 'lodash'

export default class Sequencer {
    constructor(processSequence, duration) {
        console.assert(processSequence instanceof Function, 'processSequence must be a function')
        console.assert(_.isFinite(duration), `sequencer duration ${duration}`)
        this.processSequence = processSequence
        this.duration = duration
    }
    mix(sequencer) {
        return new Sequencer(() => {
            return _.sortBy([...this.processSequence(), ...sequencer.processSequence()], 'time')
        }, Math.max(this.duration || 0, sequencer.duration || 0))
    }
    map(mapEvent, mappedDuration = this.duration) {
        return new Sequencer(() => {
            return this.processSequence().map(mapEvent)
        }, mappedDuration)
    }
    mapValue(mapValueFunction) {
        return this.map(e => {
            const [value, octave, invert] = mapValueFunction([e.value, e.octave, e.invert])
            return _.extend({}, e, { value, octave, invert })
        })
    }
    flatMap(mapEventToSequence) {
        let result = NullSequencer
        this.processSequence().forEach(sequencerEvent => {
            const s = mapEventToSequence(sequencerEvent).shift(sequencerEvent.time)
            result = result.mix(s)
        })
        return result
    }
    flatMap2(mapEventToSequence) {
        let result = NullSequencer
        this.processSequence().forEach(sequencerEvent => {
            const s = mapEventToSequence(sequencerEvent).shift(result.duration)
            result = result.mix(s)
        })
        return result
    }
    shift(delta) {
        if (!delta) return this
        return this.map(e => _.extend({}, e, { time: e.time + delta }), (this.duration || 0) + delta)
    }
    concat(...sequencers) {
        console.assert(_.isArray(sequencers), 'concat requires sequencers array')
        sequencers = [this, ...sequencers]
        let events = []
        let duration = 0
        _.forEach(sequencers, sequencer => {
            sequencer = sequencer.shift(duration)
            events.push(...sequencer.processSequence())
            duration = sequencer.duration
        })
        events = _.sortBy(events, 'time')
        return new Sequencer(() => events, duration)
    }
    loop(times) {
        console.assert(times && _.isInteger(times), 'loop times')
        let result = this
        while (--times) {
            result = result.concat(this)
        }
        return result
    }
    table() {
        const events = this.processSequence()
        const keys = ['time', 'channel', 'value', 'octave', 'invert', 'duration']
        console.table(events, keys)
    }
    scale(factor) {
        console.assert(factor && _.isFinite(factor), 'scale factor')
        return this.map(e => {
            const e1 = { time: e.time * factor }
            if (e.duration) {
                e1.duration = e.duration * factor
            }
            return Object.assign({}, e, e1)
        }, (this.duration || 0) * factor)
    }
}

export class Row {
    constructor(key, input, mapCharCodeToValue) {
        this.key = key.trim()
        this.input = input
        this.mapCharCodeToValue = mapCharCodeToValue
    }
}

export function charCodeValueInterpreter(charCode) {
    if (charCode >= 48 && charCode <= 57) {
        // numbers
        return charCode - 48
    } else if (charCode >= 97 && charCode <= 122) {
        // lower-case letters continue from 10
        return charCode - 87
    } else if (charCode === 32 || !charCode) {
        // space
        return null
    } else {
        console.assert(true, `invalid charCode ${charCode}`)
    }
}

export function charCodeOctaveInterpreter(charCode) {
    if (charCode >= 48 && charCode <= 57) {
        // numbers
        return charCode - 48
    } else if (charCode >= 97 && charCode <= 122) {
        // lower-case letters are a negative descending alphabet
        return -1 * (98 - charCode)
    } else if (charCode === 32 || !charCode) {
        // space
        return null
    } else {
        console.assert(true, `invalid charCode ${charCode}`)
    }
}

export function rowsToEvents(duration, ...rows) {
    console.assert(_.isInteger(duration), 'duration must be integer')
    console.assert(_.isArray(rows), 'rowsToEvents rows must be array')
    const meta = {
        octave: 0,
        invert: 0,
        duration: 1,
    }
    const metaKeys = _.keys(meta)
    const channels = _(rows).map('key').filter(key => key.indexOf('.') < 0).filter(key => !_.includes(metaKeys, key)).value()
    const rowByKey = _.keyBy(rows, 'key')
    const events = []
    const width = duration
    for (let i = 0; i < width; ++i) {
        for (let j = 0; j < channels.length; ++j) {
            const key = channels[j]
            const charCode = rowByKey[key].input.charCodeAt(i)
            const value = rowByKey[key].mapCharCodeToValue(charCode)
            if (value !== null && value !== undefined) {
                const event = {
                    value,
                    time: i,
                    channel: key,
                }
                metaKeys.forEach(metaKey => {
                    const qualifiedKey = `${key}.${metaKey}`
                    if (rowByKey[qualifiedKey]) {
                        const charCode = rowByKey[qualifiedKey].input.charCodeAt(i)
                        const value = rowByKey[qualifiedKey].mapCharCodeToValue(charCode)
                        if (value !== null) {
                            event[metaKey] = value
                        }
                    } else if (rowByKey[metaKey]) {
                        const charCode = rowByKey[metaKey].input.charCodeAt(i)
                        const value = rowByKey[metaKey].mapCharCodeToValue(charCode)
                        if (value !== null) {
                            event[metaKey] = value
                        }
                    }
                    if (!_.has(event, metaKey)) {
                        event[metaKey] = meta[metaKey]
                    }
                })
                events.push(event)
                _.assign(meta, _.pick(event, metaKeys))
            }
        }
    }
    return events
}

export const NullSequencer = new Sequencer(() => [], 0)
