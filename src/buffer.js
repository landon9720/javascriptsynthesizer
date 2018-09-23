import _ from 'lodash'
import { incr } from './stats'

export const samplesPerFrame = Math.pow(2, 16)

export function makeAudioFrame() {
    incr('allocated frames')
    return new Float32Array(samplesPerFrame)
}

export const emptyAudioFrame = makeAudioFrame()
