import _ from 'lodash'
import { makeAudioFrame } from './context'
import AudioProcess from './AudioProcess'
import parameterFunction from './parameterFunction'
import Sequencer from './Sequencer'
import fs from 'fs'
import Parser from './parser'
import { incr } from './stats'

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
                    return async () => {
                        if (iteratorDone) {
                            return null
                        }
                        const { value, done } = await iterator.next()
                        if (done) {
                            iteratorDone = true
                            return null
                        }
                        console.assert(
                            value && value.length <= samplesPerFrame * 4,
                            `:-) value.length = ${value.length} expected = ${samplesPerFrame * 4}`
                        )
                        console.assert(value.buffer instanceof ArrayBuffer)
                        if (value.length < samplesPerFrame * 4) {
                            const outputBuffer = makeAudioFrame(options)
                            outputBuffer.set(new Float32Array(value.buffer))
                            return outputBuffer
                        }
                        return new Float32Array(value.buffer)
                    }
                })
            }
            return read(() => {
                const readable = fs.createReadStream(filename, { autoClose: true, highWaterMark: samplesPerFrame * 4 })
                readable.on('error', e => {
                    console.error('read stream error', e)
                })
                return readable
            })
        }

        this.beats = beatNumber => {
            return Math.round(beatNumber * samplesPerBeat)
        }

        this.note = value => {
            if (_.isInteger(value)) {
                value = { value, octave: 0, invert: 0 }
            }
            let { value: noteNumber, octave, invert } = value
            console.assert(
                _.isInteger(noteNumber) && _.isInteger(octave) && _.isInteger(invert),
                `note bad input: ${value}`
            )
            if (invert) {
                noteNumber *= -1
                octave *= -1
            }
            const beautifulNumber = Math.pow(2, 1 / 12)
            const f = basisFrequency * Math.pow(beautifulNumber, (octave * 12 + noteNumber))
            return f
        }

        this.matrix = textInput => {
            const matrixes = Parser.Root.tryParse(textInput)
            return _.mapValues(matrixes, matrix => {
                const rows = matrix.datarows.map(line => {
                    const key = line.key
                    const input = line.data
                    let interpreter = charCodeValueInterpreter
                    if (key === 'octave') {
                        interpreter = charCodeOctaveInterpreter
                    }
                    return new Row(key, input, interpreter)
                })
                const events = rowsToEvents(matrix.duration, ...rows)
                return new Sequencer(() => events, matrix.duration)
            })
        }

        this.sequencerToAudioProcess = (sequence, eventToAudioProcess) => {
            if (eventToAudioProcess instanceof AudioProcess) {
                const _i = eventToAudioProcess
                eventToAudioProcess = () => _i
            }
            const events = sequence.processSequence()
            let audioProcess = this.mix(
                ..._.map(events, e => eventToAudioProcess(e).delay(Math.round(e.time * options.samplesPerBeat)))
            )
            if (sequence.duration) {
                audioProcess = audioProcess.duration(sequence.duration * options.samplesPerBeat)
            }
            return audioProcess
        }

        this.nullAudioProcess = new AudioProcess(options, () => () => null)
    }
}

export class Row {
    constructor(key, input, mapCharCodeToValue) {
        this.key = key.trim()
        this.input = input
        this.mapCharCodeToValue = mapCharCodeToValue
    }
}

export function charCodeValueInterpreter(charCode) {
    if (charCode >= 48 && charCode <= 57) {
        // numbers
        return charCode - 48
    } else if (charCode >= 97 && charCode <= 122) {
        // lower-case letters continue from 10
        return charCode - 87
    } else if (charCode === 32 || !charCode) {
        // space
        return null
    } else {
        console.assert(true, `invalid charCode ${charCode}`)
    }
}

export function charCodeOctaveInterpreter(charCode) {
    if (charCode >= 48 && charCode <= 57) {
        // numbers
        return charCode - 48
    } else if (charCode >= 97 && charCode <= 122) {
        // lower-case letters are a negative descending alphabet
        return -1 * (98 - charCode)
    } else if (charCode === 32 || !charCode) {
        // space
        return null
    } else {
        console.assert(true, `invalid charCode ${charCode}`)
    }
}

export function rowsToEvents(duration, ...rows) {
    console.assert(_.isInteger(duration), 'duration must be integer')
    console.assert(_.isArray(rows), 'rowsToEvents rows must be array')
    const meta = {
        octave: 0,
        invert: 0,
        duration: 1,
    }
    const metaKeys = _.keys(meta)
    const channels = _(rows)
        .map('key')
        .filter(key => key.indexOf('.') < 0)
        .filter(key => !_.includes(metaKeys, key))
        .value()
    const rowByKey = _.keyBy(rows, 'key')
    const events = []
    const width = duration
    for (let i = 0; i < width; ++i) {
        for (let j = 0; j < channels.length; ++j) {
            const key = channels[j]
            const charCode = rowByKey[key].input.charCodeAt(i)
            const value = rowByKey[key].mapCharCodeToValue(charCode)
            if (value !== null && value !== undefined) {
                const event = {
                    value,
                    time: i,
                    channel: key,
                }
                metaKeys.forEach(metaKey => {
                    const qualifiedKey = `${key}.${metaKey}`
                    if (rowByKey[qualifiedKey]) {
                        const charCode = rowByKey[qualifiedKey].input.charCodeAt(i)
                        const value = rowByKey[qualifiedKey].mapCharCodeToValue(charCode)
                        if (value !== null) {
                            event[metaKey] = value
                        }
                    } else if (rowByKey[metaKey]) {
                        const charCode = rowByKey[metaKey].input.charCodeAt(i)
                        const value = rowByKey[metaKey].mapCharCodeToValue(charCode)
                        if (value !== null) {
                            event[metaKey] = value
                        }
                    }
                    if (!_.has(event, metaKey)) {
                        event[metaKey] = meta[metaKey]
                    }
                })
                events.push(event)
                _.assign(meta, _.pick(event, metaKeys))
            }
        }
    }
    return events
}
