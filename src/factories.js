import _ from 'lodash'
import { context, F, makeAudioFrame } from './context'
import AudioProcess from './AudioProcess'
import Sequencer from './Sequencer'
import { samplesPerFrame, parameterFunction } from './fundamentals'

export function sin(freq = () => 440) {
    freq = parameterFunction(freq)
    let y0 = 0
    let y1 = Math.sin(2 * Math.PI * freq(1) / F)
    function c(f) {
        const omega = 2 * Math.PI * f / F
        const c = 2 * Math.cos(omega)
        return c
    }
    let absoluteIndex = 2
    return new AudioProcess(() => {
        return () => {
            const { outputBuffer, output } = makeAudioFrame()
            for (let i = 0; i < output.length; i += 2) {
                const sampleIndex0 = absoluteIndex++
                const sampleIndex1 = absoluteIndex++
                output[i + 0] = y0
                output[i + 1] = y1
                y0 = c(freq(sampleIndex0)) * y1 - y0
                y1 = c(freq(sampleIndex1)) * y0 - y1
            }
            return outputBuffer
        }
    })
}

// export function square(f = 440, numberOfFrames, dutyFunction = () => 0.5) {
//     const period = F / f
//     let absoluteIndex = 0
//     return new AudioProcess(() => {
//         return (counter, numberOfFrames) => {
//             console.assert(counter < numberOfFrames)
//             const outputBuffer = context.createBuffer(1, samplesPerFrame, 44100)
//             const output = outputBuffer.getChannelData(0)
//             for (let i = 0; i < output.length; ++i) {
//                 const b = absoluteIndex++ % period
//                 const c = b / period
//                 output[i] = (c < dutyFunction((counter * samplesPerFrame + i) / (numberOfFrames * samplesPerFrame)) ? 1 : -1)
//             }
//             return outputBuffer
//         }
//     }, numberOfFrames)
// }

// export function saw(f = 440, numberOfFrames) {
//     const period = F / f
//     let absoluteIndex = 0
//     return new AudioProcess(() => {
//         return (counter, numberOfFrames) => {
//             console.assert(counter < numberOfFrames)
//             const outputBuffer = context.createBuffer(1, samplesPerFrame, 44100)
//             const output = outputBuffer.getChannelData(0)
//             for (let i = 0; i < output.length; ++i) {
//                 const b = (counter + absoluteIndex++) % period
//                 const c = b / period
//                 output[i] = c
//             }
//             return outputBuffer
//         }
//     }, numberOfFrames)
// }

// export function triangle(f = 440, numberOfFrames) {
//     const period = F / f
//     let absoluteIndex = 0
//     return new AudioProcess(() => {
//         return (counter, numberOfFrames) => {
//             console.assert(counter < numberOfFrames)
//             const outputBuffer = context.createBuffer(1, samplesPerFrame, 44100)
//             const output = outputBuffer.getChannelData(0)
//             for (let i = 0; i < output.length; ++i) {
//                 const b = (absoluteIndex++) % period
//                 const c = b / period
//                 if (c < 0.25) {
//                     output[i] = c * 4
//                 } else if (c < 0.5) {
//                     output[i] = (1 - (c - 0.25) * 4)
//                 } else if (c < 0.75) {
//                     output[i] = (c - 0.5) * 4 * -1
//                 } else {
//                     output[i] = (-1 + (c - 0.75) * 4)
//                 }
//             }
//             return outputBuffer
//         }
//     }, numberOfFrames)
// }

export function sum(...inputs) {
    return new AudioProcess(() => {
        _.forEach(inputs, i => i.initialize())
        return () => {
            const { outputBuffer, output } = makeAudioFrame()
            _.forEach(inputs, input => {
                const inputBuffer = input.processAudio().getChannelData(0)
                for (let i = 0; i < inputBuffer.length; ++i) {
                    output[i] += inputBuffer[i]
                }
            })
            return outputBuffer
        }
    })
}

// export function seq(...inputs) {
//     return new AudioProcess(() => {
//         _.forEach(inputs, i => i.initialize())
//         let i = 0
//         let input = inputs[i]
//         return (counter, numberOfFrames) => {
//             console.assert(counter < numberOfFrames)
//             if (input.counter === input.numberOfFrames) {
//                 input = inputs[++i]
//             }
//             return input.processAudio()
//         }
//     }, _.sumBy(inputs, i => i.numberOfFrames))
// }

// export function sequence(events) {
//     return new Sequencer(() => events)
// }

export function value(v) {
    v = parameterFunction(v)
    return new AudioProcess(() => {
        return frameCounter => {
            const { outputBuffer, output } = makeAudioFrame()
            for (let i = 0; i < samplesPerFrame; ++i) {
                const sampleIndex = frameCounter * samplesPerFrame + i
                output[i] = v(sampleIndex)
            }
            return outputBuffer
        }
    })
}