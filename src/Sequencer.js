import _ from 'lodash'

export default class Sequencer {
    constructor(processSequence, duration) {
        console.assert(processSequence instanceof Function, 'processSequence must be a function')
        console.assert(duration && _.isFinite(duration), 'sequencer duration')
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
    mapValues(mapValue) {
        return this.map(event => {
            return _.mapValues(event, (value, key) => {
                if (key === 'time' || key === 'duration') return value
                else return mapValue(value)
            })
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
    shift(delta) {
        if (!delta) return this
        return this.map(e => _.extend({}, e, { time: e.time + delta }), this.duration + delta)
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
    delay(beats) {
        return this.map(e => _.extend({}, e, { time: e.time + beats }), (this.duration || 0) + beats)
    }
    loop(times) {
        console.assert(times && _.isFinite(times), 'loop times')
        let result = this
        while (--times) {
            result = result.concat(this)
        }
        return result
    }
    table() {
        const events = this.processSequence()
        const keys = Array.from(new Set(_.flatMap(events, e => Object.keys(e))))
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
        // lower-case letters
        return charCode - 87
    } else if (charCode === 32 || !charCode) {
        // space
        return null
    } else {
        console.assert(true, `invalid charCode ${charCode}`)
    }
}

export function rowsToEvents(...rows) {
    const events = []
    const width = rows[0].input.length
    for (let i = 0; i < width; ++i) {
        const event = {
            time: i,
        }
        for (let j = 0; j < rows.length; ++j) {
            const row = rows[j]
            const charCode = row.input.charCodeAt(i)
            const value = row.mapCharCodeToValue(charCode)
            if (value !== null) {
                event[row.key] = value
            }
        }
        if (_.size(event) > 1) {
            events.push(event)
        }
    }
    return events
}

export const NullSequencer = new Sequencer(() => [], 0)
