import './style.css'
import _ from 'lodash'
import { play } from './context'
import { sin, square, saw, triangle, sum, seq, loop, sequence } from './factories'
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
        result[key] = Number(char)
        return result
    }
}

// let tuneSequence = inputMatrix(
//     `
//     1358135185311351
//     1111111111111114
//     0000111100001111`,
//     [row('value'), row('duration'), row('octave')]
// )
// console.log('tuneSequence 1', tuneSequence.processSequence())
// tuneSequence = tuneSequence.map(e => _.extend({}, e, { value: note(e.value, e.octave), duration: beat(e.duration) }))
// console.log('tuneSequence 2', tuneSequence.processSequence())
// tuneSequence = tuneSequence.repeat(4)
// console.log('tuneSequence 3', tuneSequence.processSequence())

// let tune = tuneSequence.toAudioProcess(e => sin(e.value, 0.1, e.duration))
// let tune = tuneSequence.toAudioProcess(e => borg(e.value, e.duration))
// let tune = seq(
//     square(440, .1, 100, a => a),
//     square(440, .1, 100, a => 1 - a),
// )
let tune = seq(..._.map(_.range(0, 1024, 100), i => sum(
    sin(440, 0.5, 100).delayFine(0),
    sin(440, 0.5, 100).delayFine(i),
)))

console.log('tune length', tune.numberOfFrames, 'frames')

tune = tune.sample()
// tune = loop(tune)

setTimeout(() => play(tune), 1000)
