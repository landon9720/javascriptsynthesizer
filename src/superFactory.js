import _ from 'lodash'
import { makeAudioFrame, emptyAudioFrame } from './buffer'
import AudioProcess from './AudioProcess'
import parameterFunction from './parameterFunction'
import fs from 'fs'
import { incr } from './stats'
import chunker from 'stream-chunker'
import { Readable } from 'stream'
import { samplesPerFrame } from './buffer'

export class SuperFactory {
    constructor(options) {
        const { samplesPerSecond, basisFrequency = 440 } = options
        console.assert(samplesPerSecond, 'SuperFactory samplesPerSecond')
        console.assert(basisFrequency, 'SuperFactory basisFrequency ')

        this.sin = (frequency = 440) => {
            frequency = parameterFunction(options, frequency)
            function c(f) {
                const omega = (2 * Math.PI * f) / samplesPerSecond
                const c = 2 * Math.cos(omega)
                return c
            }
            return new AudioProcess(options, async () => {
                const frequencyProcessAudio = await frequency.initialize()
                let y0, y1
                return async () => {
                    const frequenceBuffer = await frequencyProcessAudio()
                    if (!y0) {
                        y0 = 0
                        y1 = Math.sin((2 * Math.PI * frequenceBuffer[1]) / samplesPerSecond)
                    }
                    const outputBuffer = makeAudioFrame(options)
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
        }

        this.square = (frequency = 440, dutyCycle = 0.5) => {
            frequency = parameterFunction(options, frequency)
            dutyCycle = parameterFunction(options, dutyCycle)
            return new AudioProcess(options, async () => {
                const frequencyProcessAudio = await frequency.initialize()
                const dutyCycleProcessAudio = await dutyCycle.initialize()
                let absoluteIndex = 0
                let periodStartIndex = 0
                return async () => {
                    const frequencyBuffer = await frequencyProcessAudio()
                    const dutyCycleBuffer = await dutyCycleProcessAudio()
                    const outputBuffer = makeAudioFrame(options)
                    for (let i = 0; i < outputBuffer.length; ++i) {
                        const period = samplesPerSecond / frequencyBuffer[i]
                        const position = (absoluteIndex - periodStartIndex) / period
                        const sample = position < dutyCycleBuffer[i] ? -1 : 1
                        if (position > 1) {
                            periodStartIndex = absoluteIndex
                        }
                        outputBuffer[i] = sample
                        ++absoluteIndex
                    }
                    return outputBuffer
                }
            })
        }

        this.saw = (frequency = 440) => {
            frequency = parameterFunction(options, frequency)
            return new AudioProcess(options, async () => {
                const frequencyProcessAudio = await frequency.initialize()
                let absoluteIndex = 0
                let periodStartIndex = 0
                return async () => {
                    const frequencyBuffer = await frequencyProcessAudio()
                    const outputBuffer = makeAudioFrame(options)
                    for (let i = 0; i < outputBuffer.length; ++i) {
                        const period = samplesPerSecond / frequencyBuffer[i]
                        const position = (absoluteIndex - periodStartIndex) / period
                        const sample = position * 2 - 1
                        if (position > 1) {
                            periodStartIndex = absoluteIndex
                        }
                        outputBuffer[i] = sample
                        ++absoluteIndex
                    }
                    return outputBuffer
                }
            })
        }

        this.triangle = (frequency = 440) => {
            frequency = parameterFunction(options, frequency)
            return new AudioProcess(options, async () => {
                const frequencyProcessAudio = await frequency.initialize()
                let absoluteIndex = 0
                let periodStartIndex = 0
                return async () => {
                    const frequencyBuffer = await frequencyProcessAudio()
                    const outputBuffer = makeAudioFrame(options)
                    for (let i = 0; i < outputBuffer.length; ++i) {
                        const period = samplesPerSecond / frequencyBuffer[i]
                        const position = (absoluteIndex - periodStartIndex) / period
                        let sample
                        if (position < 0.25) {
                            sample = position * 4
                        } else if (position < 0.5) {
                            sample = 1 - (position - 0.25) * 4
                        } else if (position < 0.75) {
                            sample = (position - 0.5) * 4 * -1
                        } else {
                            sample = -1 + (position - 0.75) * 4
                        }
                        if (position > 1) {
                            periodStartIndex = absoluteIndex
                        }
                        outputBuffer[i] = sample
                        ++absoluteIndex
                    }
                    return outputBuffer
                }
            })
        }

        this.whitenoise = () => {
            return new AudioProcess(options, () => {
                return () => {
                    const outputBuffer = makeAudioFrame(options)
                    for (let i = 0; i < outputBuffer.length; ++i) {
                        const sample = Math.random() * 2 - 1
                        outputBuffer[i] = sample
                    }
                    return outputBuffer
                }
            })
        }

        this.sum = (...inputs) => {
            return new AudioProcess(options, async () => {
                const processAudios = await Promise.map(inputs, i => i.initialize(), { concurrency: 10 })
                return async () => {
                    let inputBuffers = await Promise.map(processAudios, processAudio => processAudio(), { concurrency: 10 })
                    inputBuffers = inputBuffers.filter(inputBuffer => inputBuffer && inputBuffer !== emptyAudioFrame)
                    if (_.isEmpty(inputBuffers)) return
                    const outputBuffer = makeAudioFrame(options)
                    _.forEach(inputBuffers, inputBuffer => {
                        for (let i = 0; i < inputBuffer.length; ++i) {
                            outputBuffer[i] += inputBuffer[i]
                        }
                    })
                    return outputBuffer
                }
            })
        }

        this.mix = (...inputs) => {
            console.assert(!_.isEmpty(inputs), 'mix inputs cannot be empty')
            const maxOffset = _(inputs)
                .map(ap => ap.offset())
                .max()
            return new AudioProcess(options, async () => {
                const audioProcesses = _.map(inputs, ap => {
                    return ap.delay(maxOffset - ap.offset())
                })
                const processAudios = await Promise.map(audioProcesses, ap => ap.initialize(), { concurrency: 10 })
                return async () => {
                    let inputBuffers = await Promise.map(processAudios, processAudio => processAudio(), { concurrency: 10 })
                    inputBuffers = inputBuffers.filter(inputBuffer => inputBuffer && inputBuffer !== emptyAudioFrame)
                    if (_.isEmpty(inputBuffers)) return
                    const outputBuffer = makeAudioFrame(options)
                    _.forEach(inputBuffers, inputBuffer => {
                        for (let i = 0; i < inputBuffer.length; ++i) {
                            outputBuffer[i] += inputBuffer[i]
                        }
                    })
                    return outputBuffer
                }
            }).offset(maxOffset)
        }

        // outputs the input audio processes one at a time, in order
        this.ordered = (...inputs) => {
            return new AudioProcess(options, async () => {
                const processAudios = await Promise.map(inputs, i => i.initialize(), { concurrency: 10 })
                return async () => {
                    let buffer
                    while (!buffer) {
                        if (_.isEmpty(processAudios)) return
                        const processAudio = processAudios[0]
                        buffer = await processAudio()
                        if (!buffer) {
                            processAudios.shift()
                        }
                    }
                    return buffer
                }
            })
        }

        this.value = v => {
            v = parameterFunction(options, v)
            return new AudioProcess(options, async () => {
                const vProcessAudio = await v.initialize()
                return async () => {
                    const outputBuffer = makeAudioFrame(options)
                    const vBuffer = await vProcessAudio()
                    if (_.isEmpty(vBuffer)) return
                    for (let i = 0; i < samplesPerFrame; ++i) {
                        outputBuffer[i] = vBuffer[i]
                    }
                    return outputBuffer
                }
            })
        }

        this.readFile = filename => {
            function read(readableFactory) {
                return new AudioProcess(options, () => {
                    const readable = readableFactory()
                    const iterator = readable[Symbol.asyncIterator]()
                    let done
                    let buffer
                    return async () => {
                        if (done) {
                            return null
                        }
                        if (buffer && buffer.length) {
                            const b = buffer.slice(0, samplesPerFrame)
                            buffer = buffer.slice(samplesPerFrame)
                            return b
                        }
                        const { value, done: iteratorDone } = await iterator.next()
                        if (iteratorDone) {
                            done = true
                            return null
                        }
                        buffer = new Float32Array(
                            value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength)
                        )
                        console.assert(buffer.length % samplesPerFrame === 0, 'buffer length multiple of frame length')
                        incr('read frames', buffer.length / samplesPerFrame)
                        const b = buffer.slice(0, samplesPerFrame)
                        buffer = buffer.slice(samplesPerFrame)
                        return b
                    }
                })
            }
            return read(() => {
                const readable = fs
                    .createReadStream(filename, { autoClose: true, highWaterMark: samplesPerFrame * 4 })
                    .pipe(chunker(samplesPerFrame * 4, { flush: true, align: true }))
                readable.on('error', e => {
                    console.error('read stream error', e)
                })
                return new Readable().wrap(readable)
            })
        }

        this.note = value => {
            console.assert(_.isInteger(value), `note bad input: ${value}`)
            const beautifulNumber = Math.pow(2, 1 / 12)
            return basisFrequency * Math.pow(beautifulNumber, value)
        }

        this.seconds = durationSeconds => {
            console.assert(_.isInteger(durationSeconds), `seconds bad input: ${durationSeconds}`)
            return durationSeconds * samplesPerSecond
        }

        this.nullAudioProcess = new AudioProcess(options, () => () => null)
    }
}
