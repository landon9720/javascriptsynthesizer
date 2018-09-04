import _ from 'lodash'
import { makeAudioFrame } from './context'
import AudioProcess from './AudioProcess'
import parameterFunction from './parameterFunction'
import Sequencer from './Sequencer'
import fs from 'fs'

export function superFactory(audioProcessOptions) {
    const { samplesPerFrame, samplesPerBeat, samplesPerSecond, basisFrequency = 440 } = audioProcessOptions
    console.assert(samplesPerFrame)
    console.assert(samplesPerBeat)
    console.assert(samplesPerSecond)
    console.assert(basisFrequency)
    return {
        sin(frequency = 440) {
            frequency = parameterFunction(audioProcessOptions, frequency)
            function c(f) {
                const omega = (2 * Math.PI * f) / samplesPerSecond
                const c = 2 * Math.cos(omega)
                return c
            }
            return new AudioProcess(audioProcessOptions, async () => {
                const frequencyProcessAudio = await frequency.initialize()
                let y0, y1
                return async () => {
                    const frequenceBuffer = await frequencyProcessAudio()
                    if (!y0) {
                        y0 = 0
                        y1 = Math.sin((2 * Math.PI * frequenceBuffer[1]) / samplesPerSecond)
                    }
                    const outputBuffer = makeAudioFrame(audioProcessOptions)
                    for (let i = 0; i < outputBuffer.length; i += 2) {
                        const sampleIndex0 = i + 0
                        const sampleIndex1 = i + 1
                        outputBuffer[i + 0] = y0
                        outputBuffer[i + 1] = y1
                        y0 = c(frequenceBuffer[sampleIndex0]) * y1 - y0
                        y1 = c(frequenceBuffer[sampleIndex1]) * y0 - y1
                    }
                    return outputBuffer
                }
            })
        },

        square(frequency = 440, dutyCycle = 0.5) {
            frequency = parameterFunction(audioProcessOptions, frequency)
            dutyCycle = parameterFunction(audioProcessOptions, dutyCycle)
            return new AudioProcess(audioProcessOptions, async () => {
                const frequencyProcessAudio = await frequency.initialize()
                const dutyCycleProcessAudio = await dutyCycle.initialize()
                let absoluteIndex = 0
                let dutyStartIndex = 0
                return async () => {
                    const frequencyBuffer = await frequencyProcessAudio()
                    const dutyCycleBuffer = await dutyCycleProcessAudio()
                    const outputBuffer = makeAudioFrame(audioProcessOptions)
                    for (let i = 0; i < outputBuffer.length; ++i) {
                        const period = samplesPerSecond / frequencyBuffer[i]
                        const position = (absoluteIndex - dutyStartIndex) / period
                        const sample = position < dutyCycleBuffer[i] ? -1 : 1
                        if (position > 1) {
                            dutyStartIndex = absoluteIndex
                        }
                        outputBuffer[i] = sample
                        ++absoluteIndex
                    }
                    return outputBuffer
                }
            })
        },

        // export function saw(f = 440, numberOfFrames) {
        //     const period = F / f
        //     let absoluteIndex = 0
        //     return new AudioProcess(() => {
        //         return (counter, numberOfFrames) => {
        //             console.assert(counter < numberOfFrames)
        //             const outputBuffer = context.createBuffer(1, samplesPerFrame, 44100)
        //             const output = outputBuffer
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
        //             const output = outputBuffer
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

        sum(...inputs) {
            return new AudioProcess(audioProcessOptions, async () => {
                const processAudios = await Promise.all(_.map(inputs, i => i.initialize()))
                return async () => {
                    const outputBuffer = makeAudioFrame(audioProcessOptions)
                    const inputBuffers = await Promise.all(_.map(processAudios, processAudio => processAudio()))
                    _.forEach(inputBuffers, inputBuffer => {
                        for (let i = 0; i < inputBuffer.length; ++i) {
                            outputBuffer[i] += inputBuffer[i]
                        }
                    })
                    return outputBuffer
                }
            })
        },

        mix(...inputs) {
            const maxOffset = _(inputs).map(ap => ap.offset()).max()
            return new AudioProcess(audioProcessOptions, async () => {
                const audioProcesses = _.map(inputs, ap => {
                    return ap.delay(maxOffset - ap.offset())
                })
                const processAudios = await Promise.all(_.map(audioProcesses, ap => ap.initialize()))
                return async () => {
                    const outputBuffer = makeAudioFrame(audioProcessOptions)
                    const inputBuffers = await Promise.all(_.map(processAudios, processAudio => processAudio()))
                    _.forEach(inputBuffers, inputBuffer => {
                        for (let i = 0; i < inputBuffer.length; ++i) {
                            outputBuffer[i] += inputBuffer[i]
                        }
                    })
                    return outputBuffer
                }
            }).offset(maxOffset)
        },

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

        value(v) {
            v = parameterFunction(audioProcessOptions, v)
            return new AudioProcess(audioProcessOptions, async () => {
                const vProcessAudio = await v.initialize()
                return async () => {
                    const outputBuffer = makeAudioFrame(audioProcessOptions)
                    const vBuffer = await vProcessAudio()
                    for (let i = 0; i < samplesPerFrame; ++i) {
                        outputBuffer[i] = vBuffer[i]
                    }
                    return outputBuffer
                }
            })
        },

        readFile(filename) {
            function read(readableFactory) {
                return new AudioProcess(audioProcessOptions, () => {
                    const readable = readableFactory()
                    console.assert(readable)
                    const iterator = readable[Symbol.asyncIterator]()
                    let iteratorDone = false
                    return async f => {
                        if (iteratorDone) {
                            return makeAudioFrame(audioProcessOptions)
                        }
                        const { value, done } = await iterator.next()
                        if (done) {
                            iteratorDone = true
                            return makeAudioFrame(audioProcessOptions)
                        }
                        console.assert(value && value.length <= samplesPerFrame * 4, ':-)')
                        console.assert(value.buffer instanceof ArrayBuffer)
                        if (value.length < samplesPerFrame * 4) {
                            const outputBuffer = makeAudioFrame(audioProcessOptions)
                            outputBuffer.set(new Float32Array(value.buffer))
                            outputBuffer.fill(0, value.buffer.length / 4)
                            return outputBuffer
                        }
                        return new Float32Array(value.buffer)
                    }
                })
            }
            return read(() => {
                const readable = fs.createReadStream(filename, { autoClose: true, highWatexrMark: samplesPerFrame * 4 })
                readable.on('error', e => {
                    console.error('read stream error', e)
                })
                // readable.on('close', () => console.log('readable close'))
                // readable.on('end', () => console.log('readable end'))
                return readable
            })
        },
        beats(beatNumber) {
            return Math.round(beatNumber * samplesPerBeat)
        },
        note(noteNumber = 0, octave = 0) {
            const beautifulNumber = Math.pow(2, 1 / 12)
            return basisFrequency * Math.pow(beautifulNumber, octave * 12 + noteNumber)
        },
        sequencer(events) {
            return new Sequencer(audioProcessOptions, () => events)
        },
    }
}
