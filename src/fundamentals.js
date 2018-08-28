
export const samplesPerFrame = Math.pow(2, 10)
// export const framesPerBeat = 1
// export const beats = b => b * 10 //framesPerBeat * samplesPerFrame // samples per beat

export const basisFrequency = 440
export const beautifulNumber = Math.pow(2, 1 / 12)
export const note = (noteNumber = 0, octave = 0) => basisFrequency * Math.pow(beautifulNumber, octave * 12 + noteNumber)

const a = 5
const b = -10
export const sigmoid = x => 1 / (1 + Math.pow(Math.E, a + b * x))

import AudioProcess from './AudioProcess'

import _ from 'lodash'

export function parameterFunction(p) {
    if (p instanceof AudioProcess) {
        return p.toFunction()
    }
    if (!_.isFunction(p)) {
        return () => p
    }
    return p
}
