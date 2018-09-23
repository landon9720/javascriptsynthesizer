import fs from 'fs'
import { spawn } from 'child_process'
import path from 'path'
import _ from 'lodash'
import AudioProcessReadable from './AudioProcessReadable'
import { makeAudioFrame, samplesPerFrame, emptyAudioFrame } from './buffer'
import parameterFunction from './parameterFunction'
import { SuperFactory } from './superFactory'
import { incr } from './stats'

// AudioProcess encapsulates a function that takes a frame counter and returns a frame of data
//   js file: export default function eg sin
//   a static number eg value(440) or note(0, 0)
// AudioProcesses may take parameters
// Parameters are AudioProcesses
export default class AudioProcess {
    constructor(options, initialize) {
        console.assert(_.isObject(options), 'options must be an object')
        console.assert(_.isFunction(initialize), 'initialize must be a function')
        const { samplesPerBeat, samplesPerSecond, basisFrequency = 440 } = (this.options = options)
        console.assert(samplesPerBeat)
        console.assert(samplesPerSecond)
        console.assert(basisFrequency)
        this.initialize = async () => {
            let frameCounter = 0
            let done = false
            try {
                const processAudio = await initialize()
                console.assert(_.isFunction(processAudio), `processAudio is not a function: ${processAudio}`)
                return async () => {
                    try {
                        if (done) return
                        const frame = await processAudio(frameCounter++)
                        incr('frames processed')
                        if (!frame) {
                            done = true
                            return null
                        }
                        console.assert(frame instanceof Float32Array, `AudioProcess frame instanceof Float32Array`)
                        console.assert(frame.length === samplesPerFrame, `processAudio returned frame.length ${frame.length} != samplesPerFrame ${samplesPerFrame}`)
                        return frame
                    } catch (e) {
                        console.error('processAudio exception', e)
                    }
                }
            } catch (e) {
                console.error('initialize exception', e)
            }
        }
        incr('AudioProcess instances')
    }
    duration(durationSamples) {
        console.assert(_.isInteger(durationSamples), `durationSamples ${durationSamples} must be an integer`)
        return new AudioProcess(this.options, async () => {
            const processAudio = await this.initialize()
            return frameCounter => {
                if (frameCounter * samplesPerFrame > durationSamples) {
                    return
                }
                return processAudio()
            }
        })
    }
    concat(...inputs) {
        const { ordered } = new SuperFactory(this.options)
        return ordered(...[this, ...inputs])
    }
    loop(times) {
        console.assert(_.isInteger(times), 'times must be a number')
        let result = this
        while (--times > 0) {
            result = result.concat(this)
        }
        return result
    }
    offset(offsetSamples) {
        if (_.isInteger(offsetSamples)) {
            this.options = Object.assign({}, this.options, { offset: offsetSamples })
            return this
        } else {
            return this.options.offset
        }
    }
    gain(factor) {
        factor = parameterFunction(this.options, factor)
        return new AudioProcess(this.options, async () => {
            const processAudio = await this.initialize()
            const factorProcessAudio = await factor.initialize()
            return async () => {
                const inputBuffer = await processAudio()
                if (!inputBuffer) return
                const factorBuffer = await factorProcessAudio()
                if (!factorBuffer) return
                const outputBuffer = makeAudioFrame()
                for (let i = 0; i < inputBuffer.length; ++i) {
                    outputBuffer[i] = inputBuffer[i] * factorBuffer[i]
                }
                return outputBuffer
            }
        })
    }
    add(value) {
        value = parameterFunction(this.options, value)
        return new AudioProcess(this.options, async () => {
            const processAudio = await this.initialize()
            const valueProcessAudio = await value.initialize()
            return async () => {
                const inputBuffer = await processAudio()
                if (!inputBuffer) return
                const valueBuffer = await valueProcessAudio()
                if (!valueBuffer) return
                const outputBuffer = makeAudioFrame()
                for (let i = 0; i < inputBuffer.length; ++i) {
                    outputBuffer[i] = inputBuffer[i] + valueBuffer[i]
                }
                return outputBuffer
            }
        })
    }
    delay(sampleCount) {
        console.assert(_.isInteger(sampleCount), 'delay sampleCount must be a number')
        const frameCount = Math.floor(sampleCount / samplesPerFrame)
        const sampleRemainderCount = sampleCount % samplesPerFrame
        let result = this
        if (frameCount) {
            result = result.delayFrames(frameCount)
        }
        if (sampleRemainderCount) {
            result = result.delaySamples(sampleRemainderCount)
        }
        return result
    }
    delayFrames(frameCount) {
        console.assert(_.isInteger(frameCount), 'delayFrames frameCount must be a number')
        return new AudioProcess(this.options, async () => {
            const processAudio = await this.initialize()
            return frameCounter => {
                if (frameCounter < frameCount) {
                    return emptyAudioFrame
                }
                return processAudio()
            }
        })
    }
    delaySamples(sampleCount) {
        console.assert(_.isInteger(sampleCount), 'delaySamples sampleCount must be a number')
        return new AudioProcess(this.options, async () => {
            const processAudio = await this.initialize()
            let inputBuffer
            let done = false
            return async () => {
                let outputBuffer
                if (inputBuffer) {
                    outputBuffer = outputBuffer || makeAudioFrame()
                    for (let i = 0; i < sampleCount; ++i) {
                        outputBuffer[i] = inputBuffer[i + samplesPerFrame - sampleCount]
                    }
                }
                inputBuffer = null
                if (done) return outputBuffer
                inputBuffer = await processAudio()
                if (inputBuffer) {
                    outputBuffer = outputBuffer || makeAudioFrame()
                    for (let i = 0; i < samplesPerFrame - sampleCount; ++i) {
                        outputBuffer[i + sampleCount] = inputBuffer[i]
                    }
                } else {
                    done = true
                }
                return outputBuffer
            }
        })
    }
    adsr({
        A = this.options.samplesPerSecond / 100,
        D = 0,
        S,
        R = this.options.samplesPerSecond / 100,
        duration,
        sustainLevel = 1,
        attackFunction = sigmoid,
        decayFunction = sigmoid,
        releaseFunction = sigmoid,
    } = {}) {
        console.assert(A && R)
        S = S || (duration || this.options.samplesPerSecond) - A - D - R
        console.assert(S >= 0, 'S >= 0')
        const factor = sampleNumber => {
            if (sampleNumber < A) {
                return 1 * attackFunction(sampleNumber / A)
            }
            if (sampleNumber < A + D) {
                return 1 - (1 - sustainLevel) * decayFunction((sampleNumber - A) / D)
            }
            if (sampleNumber < A + D + S) {
                return sustainLevel
            }
            if (sampleNumber < A + D + S + R) {
                return sustainLevel * releaseFunction((A + D + S + R - sampleNumber) / R)
            }
            return 0
        }
        return new AudioProcess(this.options, async () => {
            const processAudio = await this.initialize()
            return async frameCounter => {
                const inputBuffer = await processAudio()
                if (!inputBuffer) return
                const outputBuffer = makeAudioFrame()
                for (let i = 0; i < inputBuffer.length; ++i) {
                    outputBuffer[i] = inputBuffer[i] * factor(frameCounter * samplesPerFrame + i)
                }
                return outputBuffer
            }
        }).duration(Math.ceil(A + D + S + R))
    }
    async writeFile(fileName) {
        const writer = fs.createWriteStream(fileName)
        writer.on('error', e => {
            console.error('writer error', e)
        })
        return new Promise((resolve, reject) => {
            const readable = new AudioProcessReadable(this).pipe(writer)
            readable.on('finish', () => {
                resolve()
            })
            readable.on('error', e => {
                reject(e)
            })
        })
    }
    spawn(commandFactory) {
        console.assert(_.isFunction(commandFactory), 'commandFactory must be a function')
        return new AudioProcess(this.options, async () => {
            const dir = './temp'
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir)
            }
            const id = nextAudioProcessId++
            const tempFile = `${dir}/${id}`
            const inputFile = `${tempFile}-in.raw`
            await this.writeFile(inputFile)
            const outputFile = `${tempFile}-out.raw`
            const [command, args] = commandFactory(
                path.join(process.cwd(), inputFile),
                path.join(process.cwd(), outputFile)
            )
            await runProcess(command, args)
            const { readFile } = new SuperFactory(this.options)
            const processedFile = readFile(outputFile)
            const audioProcess = await processedFile.initialize()
            return () => audioProcess()
        })
    }
    pitch(cents) {
        const fopts = `-t raw -r ${this.options.samplesPerSecond} -b 32 -e floating-point -c 1`
        return this.spawn((inputFile, outputFile) => [
            'sox',
            `${fopts} ${inputFile} ${fopts} ${outputFile} pitch ${cents} 10`,
        ])
    }
    lowpass(frequency) {
        const fopts = `-t raw -r ${this.options.samplesPerSecond} -b 32 -e floating-point -c 1`
        return this.spawn((inputFile, outputFile) => [
            'sox',
            `${fopts} ${inputFile} ${fopts} ${outputFile} lowpass ${frequency}`,
        ])
    }
    highpass(frequency) {
        const fopts = `-t raw -r ${this.options.samplesPerSecond} -b 32 -e floating-point -c 1`
        return this.spawn((inputFile, outputFile) => [
            'sox',
            `${fopts} ${inputFile} ${fopts} ${outputFile} highpass ${frequency}`,
        ])
    }
    reverb(reverberance) {
        const fopts = `-t raw -r ${this.options.samplesPerSecond} -b 32 -e floating-point -c 1`
        return this.spawn((inputFile, outputFile) => [
            'sox',
            `${fopts} ${inputFile} ${fopts} ${outputFile} reverb ${Math.round(reverberance * 100)}`,
        ])
    }
}

let nextAudioProcessId = 0

const a = 5
const b = -10
export const sigmoid = x => 1 / (1 + Math.pow(Math.E, a + b * x))

async function runProcess(command, args) {
    await new Promise((resolve, reject) => {
        const sox = spawn(command, args.split(' '), {})
        sox.stdout.on('data', data => {
            console.log(`${data}`)
        })
        sox.stderr.on('data', data => {
            console.error(`${data}`)
        })
        sox.on('close', code => {
            if (code === 0) {
                resolve()
            } else {
                reject({ command, args, code })
            }
        })
    })
}
