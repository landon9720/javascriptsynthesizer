import _ from 'lodash'
import { incr } from './stats'

export function makeAudioFrame(audioProcessOptions) {
    const { samplesPerFrame } = audioProcessOptions
    console.assert(_.isInteger(samplesPerFrame), 'makeAudioFrame samplesPerFrame')
    incr('audio frame allocations')
    return new Float32Array(samplesPerFrame)
}
