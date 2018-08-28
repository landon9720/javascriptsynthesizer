import { sum } from './factories'
import { beats } from './fundamentals.js'

export default class Sequencer {
    constructor(processSequence) {
        this.processSequence = processSequence
    }
    mix(sequencer) {
        return new Sequencer(() => {
            return [...this.processSequence(), ...sequencer.processSequence()]
        })
    }
    map(mapEvent) {
        return new Sequencer(() => {
            return this.processSequence().map(mapEvent)
        })
    }
    delay(beats) {
        return this.map(e => _.extend({}, e, { time: e.time + beats }))
    }
    repeat(times, duration) {
        return new Sequencer(() => {
            const inputSequence = this.processSequence()
            const result = []
            for (let i = 0; i < times; ++i) {
                result.push(...inputSequence.map(e => _.extend({}, e, { time: i * duration + e.time })))
            }
            return result
        })
    }
    toAudioProcess(instrument) {
        const sequence = this.processSequence()
        console.assert(sequence)
        const audioProcessFactory = e => instrument.audioProcessFactory(e)
        console.assert(audioProcessFactory)
        return sum(..._.map(sequence, e => audioProcessFactory(e).delay(beats(e.time))))
    }
    table() {
        console.table(this.processSequence(), ['time', 'value', 'duration'])
    }
}

export function sequence(events) {
    return new Sequencer(() => events)
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
