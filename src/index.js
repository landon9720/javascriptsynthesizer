import './style.css'
import _ from 'lodash'
import { play } from './context'
import { value, sin, square, saw, triangle, sum, seq, loop, sequence } from './factories'
import { note, beats, samplesPerFrame } from './fundamentals.js'
import { nil } from './AudioProcess'
import Sequencer from './Sequencer'

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
            { time: beats(t) }
        )
    })
    return new Sequencer(() => events)
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
// tuneSequence = tuneSequence.map(e => _.extend({}, e, { value: note(e.value, e.octave), duration: beats(e.duration) }))

// const bell = e => sin(e.value, e.duration).gain(sin(100)).adsr({ A: beats(0.3), D: beats(0.3), S: e.duration - beats(0.9), R: beats(0.3) })

// let tune = tuneSequence.toAudioProcess(bell)

// let tune = sin(sin(1).multiply(100).add(440))
let tune = sin(value(440).add(sin(1).multiply(100))).adsr({A: beats(4), D: beats(4), S: beats(6), R: beats(6) })

setTimeout(() => play(tune), 1)

// ASPECT ORIENTED AUDIO PROGRAMMING
