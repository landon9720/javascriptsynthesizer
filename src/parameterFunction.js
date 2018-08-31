import AudioProcess from './AudioProcess'
import _ from 'lodash'
import { makeAudioFrame } from './context'

// A AudioProcess parameter is an AudioProcess
export default function parameterFunction(audioProcessOptions, parameter) {
    const { samplesPerFrame } = audioProcessOptions
    console.assert(samplesPerFrame)
    if (parameter instanceof AudioProcess) {
        return parameter
    } else if (_.isFunction(parameter)) {
        return new AudioProcess(audioProcessOptions, () => {
            return frameCounter => {
                const outputBuffer = makeAudioFrame(audioProcessOptions)
                for (let i = 0; i < samplesPerFrame; ++i) {
                    const sampleIndex = frameCounter * samplesPerFrame + i
                    outputBuffer[i] = parameter(sampleIndex)
                }
                return outputBuffer
            }
        })
    } else if (_.isNumber(parameter)) {
        return new AudioProcess(audioProcessOptions, () => {
            return () => {
                const outputBuffer = makeAudioFrame(audioProcessOptions)
                for (let i = 0; i < samplesPerFrame; ++i) {
                    outputBuffer[i] = parameter
                }
                return outputBuffer
            }
        })
    } else {
        throw new Error(`parameterFunction parameter: ${parameter}`)
    }
}
