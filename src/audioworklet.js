import _ from 'lodash'
import { play } from './context'
import { value, sin, square, saw, triangle, sum, seq, loop, sequence } from './factories'
import { note, beats, samplesPerFrame } from './fundamentals.js'
import { nil } from './AudioProcess'
import Sequencer from './Sequencer'

console.log('AudioWorkletProcessor1 file')

class AudioWorkletProcessor1 extends AudioWorkletProcessor {

    constructor() {
        super()
        // this.tune = sin(440)
        // console.log('AudioWorkletProcessor1 constructor')
    }

    // static get parameterDescriptors() {
    //     return []
    // }

    process(inputs, outputs, parameters) {
        // const output = outputs[0]
        // const outputChannel = output[0]
        // const tuneBuffer = this.tune.processAudio()
        // tuneBuffer.copyFromChannel(outputChannel, 0)
        // return true
    }
}

registerProcessor('1', AudioWorkletProcessor1)
