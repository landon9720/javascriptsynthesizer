import _ from 'lodash'
import { makeAudioFrame } from './context'
import AudioProcess from './AudioProcess'
import parameterFunction from './parameterFunction'
import Sequencer, { Row, charCodeValueInterpreter, rowsToEvents } from './Sequencer'
import fs from 'fs'

export class SuperFactory {
    constructor(options) {
        const { samplesPerFrame, samplesPerBeat, samplesPerSecond, basisFrequency = 440 } = options
        console.assert(samplesPerFrame)
        console.assert(samplesPerBeat)
        console.assert(samplesPerSecond)
        console.assert(basisFrequency)

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
                let dutyStartIndex = 0
                return async () => {
                    const frequencyBuffer = await frequencyProcessAudio()
                    const dutyCycleBuffer = await dutyCycleProcessAudio()
                    const outputBuffer = makeAudioFrame(options)
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
        }

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

        this.sum = (...inputs) => {
            return new AudioProcess(options, async () => {
                const processAudios = await Promise.all(_.map(inputs, i => i.initialize()))
                return async () => {
                    let inputBuffers = await Promise.all(_.map(processAudios, processAudio => processAudio()))
                    inputBuffers = inputBuffers.filter(inputBuffer => inputBuffer)
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
                const processAudios = await Promise.all(_.map(audioProcesses, ap => ap.initialize()))
                return async () => {
                    let inputBuffers = await Promise.all(_.map(processAudios, processAudio => processAudio()))
                    inputBuffers = inputBuffers.filter(inputBuffer => inputBuffer)
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
                const processAudios = await Promise.all(_.map(inputs, i => i.initialize()))
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
                    let iteratorDone = false
                    return async f => {
                        if (iteratorDone) {
                            return null
                        }
                        const { value, done } = await iterator.next()
                        if (done) {
                            iteratorDone = true
                            return null
                        }
                        console.assert(value && value.length <= samplesPerFrame * 4, ':-)')
                        console.assert(value.buffer instanceof ArrayBuffer)
                        if (value.length < samplesPerFrame * 4) {
                            const outputBuffer = makeAudioFrame(options)
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
                return readable
            })
        }
        this.beats = beatNumber => {
            return Math.round(beatNumber * samplesPerBeat)
        }
        this.note = (noteNumber = 0, octave = 0) => {
            const beautifulNumber = Math.pow(2, 1 / 12)
            return basisFrequency * Math.pow(beautifulNumber, octave * 12 + noteNumber)
        }
        this.sequencer = events => {
            return new Sequencer(() => events)
        }
        this.matrix = fileName => {
            const file = fs.readFileSync(fileName, { encoding: 'utf-8' })
            const lines = file.split(/\n+/).filter(line => line.trim().length > 0)
            const header = _.head(lines)
            const body = _.tail(lines)
            const labelWidth = header.indexOf('|')
            const indexWidth = header.indexOf('|', labelWidth + 1) - labelWidth - 1
            if (labelWidth < 0) {
                throw new Error('invalid header')
            }
            const rows = body.map(
                line => new Row(line.substring(0, labelWidth), line.substring(labelWidth + 1), charCodeValueInterpreter)
            )
            const events = rowsToEvents(...rows)
            return new Sequencer(() => events, indexWidth)
        }
        this.sequencerToAudioProcess = (sequence, eventToAudioProcess) => {
            if (eventToAudioProcess instanceof AudioProcess) {
                const _i = eventToAudioProcess
                eventToAudioProcess = () => _i
            }
            const events = sequence.processSequence()
            let audioProcess = this.mix(
                ..._.map(events, e => {
                    let x = eventToAudioProcess(e)
                    console.log('x', x)
                    x = x.delay(e.time * options.samplesPerBeat)
                    return x
                })
            )
            if (sequence.duration) {
                audioProcess = audioProcess.duration(sequence.duration * options.samplesPerBeat)
            }
            return audioProcess
        }
        this.nullAudioProcess = new AudioProcess(options, () => () => null)
    }
}
