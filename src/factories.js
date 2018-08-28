import _ from 'lodash'
import { makeAudioFrame } from './context'
import AudioProcess from './AudioProcess'
import { samplesPerFrame, parameterFunction } from './fundamentals'
import fs from 'fs'
import defer from './defer'

export function audioProcessFactoryFactory(audioProcessOptions) {
    return {
        sin(freq = () => 440) {
            const { samplesPerSecond } = audioProcessOptions
            freq = parameterFunction(freq)
            let y0 = 0
            let y1 = Math.sin((2 * Math.PI * freq(1)) / samplesPerSecond)
            function c(f) {
                const omega = (2 * Math.PI * f) / samplesPerSecond
                const c = 2 * Math.cos(omega)
                return c
            }
            let absoluteIndex = 2
            return new AudioProcess(audioProcessOptions, () => {
                return () => {
                    const outputBuffer = makeAudioFrame(audioProcessOptions)
                    for (let i = 0; i < outputBuffer.length; i += 2) {
                        const sampleIndex0 = absoluteIndex++
                        const sampleIndex1 = absoluteIndex++
                        outputBuffer[i + 0] = y0
                        outputBuffer[i + 1] = y1
                        y0 = c(freq(sampleIndex0)) * y1 - y0
                        y1 = c(freq(sampleIndex1)) * y0 - y1
                    }
                    return outputBuffer
                }
            })
        },

        // export function square(f = 440, numberOfFrames, dutyFunction = () => 0.5) {
        //     const period = F / f
        //     let absoluteIndex = 0
        //     return new AudioProcess(() => {
        //         return (counter, numberOfFrames) => {
        //             console.assert(counter < numberOfFrames)
        //             const outputBuffer = context.createBuffer(1, samplesPerFrame, 44100)
        //             const output = outputBuffer
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
            return new AudioProcess(audioProcessOptions, () => {
                _.forEach(inputs, i => i.initialize())
                return async () => {
                    const outputBuffer = makeAudioFrame(audioProcessOptions)
                    const inputBuffers = await Promise.all(_.map(inputs, i => i.processAudio()))
                    _.forEach(inputBuffers, inputBuffer => {
                        for (let i = 0; i < inputBuffer.length; ++i) {
                            outputBuffer[i] += inputBuffer[i]
                        }
                    })
                    return outputBuffer
                }
            })
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
            v = parameterFunction(v)
            return new AudioProcess(audioProcessOptions, () => {
                return frameCounter => {
                    const outputBuffer = makeAudioFrame(audioProcessOptions)
                    for (let i = 0; i < samplesPerFrame; ++i) {
                        const sampleIndex = frameCounter * samplesPerFrame + i
                        outputBuffer[i] = v(sampleIndex)
                    }
                    return outputBuffer
                }
            })
        },

        readFile(filename) {
            const readable = fs.createReadStream(filename, { autoClose: true })
            readable.on('error', e => {
                console.error('read stream error', e)
            })
            return this.read(readable)
        },
        
        read(readable) {
            return new AudioProcess(audioProcessOptions, () => {
                let ready = false
                let ended = false
                let defered
                readable.on('readable', () => {
                    ready = true
                    if (defered) {
                        const bytes = readable.read(samplesPerFrame * 4)
                        console.log('bytes (1)', bytes, bytes.length)
                        defered.resolve(bytes)
                        defered = null
                    }
                })
                readable.on('end', () => {
                    console.log('end')
                    ended = true
                })
                return () => {
                    console.assert(!defered)
                    if (ended) {
                        console.log('ended')
                        return makeAudioFrame(audioProcessOptions)
                    }
                    if (!ready) {
                        defered = defer()
                        return defered.promise
                    }
                    const bytes = readable.read(samplesPerFrame * 4)
                    console.log('bytes (2)', bytes, bytes.length)
                    if (!bytes) {
                        ready = false
                        defered = defer()
                        return defered.promise
                    }
                    return new Float32Array(bytes.buffer)
                }
            })
        },
    }
}
