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
    repeat(times, duration) {
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
        const { sum } = superFactory(this.options)
        return sum(..._.map(sequence, e => instrument(e).delay(e.time * this.options.samplesPerBeat)))
    }
    table() {
        console.table(this.processSequence(), ['time', 'value', 'duration'])
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
            const charCode = rows[j].input.charCodeAt(i)
            if (charCode >= 48 && charCode <= 57) {
                // numbers
                event[rows[j].key] = charCode - 48
            } else if (charCode >= 97 && charCode <= 122) {
                // lower-case letters
                event[rows[j].key] = charCode - 87
            } else if (charCode === 32) {
                // space
            } else {
                console.assert()
            }
        }
        if (_.size(event) > 1) {
            events.push(event)
        }
    }
    return events
}

export function row(key, input) {
    return {
        key: key.trim(),
        input,
    }
}
