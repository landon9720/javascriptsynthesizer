import _ from 'lodash'
import { superFactory } from './superFactory'
import AudioProcess from './AudioProcess'

export default class Sequencer {
    constructor(options, processSequence) {
        const { samplesPerFrame, samplesPerBeat, samplesPerSecond, basisFrequency = 440 } = (this.options = options)
        console.assert(samplesPerFrame)
        console.assert(samplesPerBeat)
        console.assert(samplesPerSecond)
        console.assert(basisFrequency)
        this.processSequence = processSequence
    }
    mix(sequencer) {
        return new Sequencer(this.options, () => {
            return _.sortBy([...this.processSequence(), ...sequencer.processSequence()], e => e.time)
        })
    }
    map(mapEvent) {
        return new Sequencer(this.options, () => {
            return this.processSequence().map(mapEvent)
        })
    }
    delay(beats) {
        return this.map(e => _.extend({}, e, { time: e.time + beats }))
    }
    loop(times, duration) {
        return new Sequencer(this.options, () => {
            const inputSequence = this.processSequence()
            const result = []
            for (let i = 0; i < times; ++i) {
                result.push(...inputSequence.map(e => _.extend({}, e, { time: i * duration + e.time })))
            }
            return result
        })
    }
    // 'instrument' is a function e => audioProcess
    toAudioProcess(instrument) {
        if (instrument instanceof AudioProcess) {
            const _i = instrument
            instrument = () => _i
        }
        const sequence = this.processSequence()
        const { mix } = superFactory(this.options)
        return mix(..._.map(sequence, e => instrument(e).delay(e.time * this.options.samplesPerBeat)))
    }
    table() {
        const events = this.processSequence()
        const keys = Array.from(new Set(_.flatMap(events, e => Object.keys(e))))
        console.table(events, keys)
    }
    scale(factor) {
        return this.map(e => Object.assign({}, e, { time: e.time * factor }))
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
    } else if (charCode === 32) {
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
