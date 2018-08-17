import './style.css'
import _ from 'lodash'
import { play } from './context'
import { value, sin, square, saw, triangle, sum, seq, loop, sequence } from './factories'
import { note, beats, samplesPerFrame } from './fundamentals.js'
import { nil } from './AudioProcess'
import Sequencer from './Sequencer'

console.log('index.js')

const context = new AudioContext()
context.audioWorklet.addModule('audioworklet.js').then(() => {
    console.log('audioworklet.js addModule callback')
    const audioWorkletNode = new AudioWorkletNode(context, '1')
    audioWorkletNode.connect(context.destination)
})
