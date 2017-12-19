import './style.css'
import _ from 'lodash'
import { play } from './context'
import { sin, square, saw, sum, seq, loop, sequence } from './factories'
import { note, beat } from './fundamentals.js'
import { nil } from './AudioProcess'
import Sequencer from './Sequencer'
import { borg } from './instruments'

function inputMatrix(input, schema) {
    while (input[0] === '\n') {
        input = input.slice(1)
    }
    let indent = 0
    while (input[indent] === ' ') {
        ++indent
    }
    const lines = input.split('\n').map(l => l.slice(indent))
    const width = _(lines)
        .map(l => l.length)
        .max()
    const events = _.range(0, width).map(t => {
        return _.range(0, lines.length).reduce(
            (e, lineNumber) => {
                const char = lines[lineNumber][t]
                return schema[lineNumber](char, e)
            },
            { time: beat(t) }
        )
    })
    return sequence(events)
}

function row(key) {
    return (char, e) => {
        const result = _.clone(e)
        result[key] = char
        return result
    }
}

const tuneSequence = inputMatrix(
    `
    13581358
    43214321
    00001111`,
    [row('value'), row('duration'), row('octave')]
).map(e => _.extend({}, e, { value: note(e.value, e.octave), duration: beat(e.duration) }))

console.log('tuneSequence', tuneSequence.processSequence())

// let tune = tuneSequence.toAudioProcess(e => sin(e.value, 0.1, e.duration))
let tune = tuneSequence.toAudioProcess(e => borg(e.value, e.duration))

console.log('tune length', tune.numberOfFrames)

tune = tune.sample()
tune = loop(tune)

setTimeout(() => play(tune), 1000)
