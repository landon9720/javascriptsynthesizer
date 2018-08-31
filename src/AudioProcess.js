import { makeAudioFrame } from './context'
import parameterFunction from './parameterFunction'

// AudioProcess encapsulates a function that takes a frame counter and returns a frame of data
//   js file: export default function eg sin
//   a static number eg value(440) or note(0, 0)
// AudioProcesses may take parameters
// Parameters are AudioProcesses
export default class AudioProcess {
    constructor(options, initialize) {
        console.assert(options)
        const { samplesPerFrame, samplesPerBeat, samplesPerSecond, basisFrequency = 440 } = (this.options = options)
        console.assert(samplesPerFrame)
        console.assert(samplesPerBeat)
        console.assert(samplesPerSecond)
        console.assert(basisFrequency)
        this.frameCounter = 0
        this.initialize = async () => {
            this.frameCounter = 0
            try {
                const processAudio = await initialize()
                return async () => {
                    try { 
                        const frame = await processAudio(this.frameCounter++)
                        console.assert(frame, 'processAudio no frame returned')
                        return frame
                    } catch (e) {
                        console.error('processAudio exception', e)
                    }
                }   
            } catch (e) {
                console.error('initialize exception', e)
            }
        }
    }
    async sample(numberOfFrames) {
        const { samplesPerFrame } = this.options
        const inputArray = new Float32Array(new ArrayBuffer(numberOfFrames * samplesPerFrame * 4))
        const processAudio = await this.initialize()
        for (let i = 0; i < numberOfFrames; ++i) {
            const inputBuffer = await processAudio()
            for (let j = 0; j < samplesPerFrame; ++j) {
                inputArray[i * samplesPerFrame + j] = inputBuffer[j]
            }
        }
        return new AudioProcess(this.options, () => {
            return frameCounter => {
                const outputBuffer = makeAudioFrame(this.options)
                for (let i = 0; i < outputBuffer.length; ++i) {
                    outputBuffer[i] = inputArray[frameCounter * samplesPerFrame + i]
                }
                return outputBuffer
            }
        })
    }
    // toFunction() {
    //     let { samplesPerFrame } = this.options
    //     let inputBufferPromise
    //     return async sampleIndex => {
    //         if (sampleIndex % samplesPerFrame === 0) {
    //             inputBufferPromise = null
    //         }
    //         if (!inputBufferPromise) {
    //             inputBufferPromise = this.processAudio()
    //         }
    //         const inputBuffer = await inputBufferPromise
    //         return inputBuffer[sampleIndex % samplesPerFrame]
    //     }
    // }
    gain(factor) {
        factor = parameterFunction(this.options, factor)
        return new AudioProcess(this.options, async () => {
            const processAudio = await this.initialize()
            const factorProcessAudio = await factor.initialize()
            return async () => {
                const outputBuffer = makeAudioFrame(this.options)
                const inputBuffer = await processAudio()
                const factorBuffer = await factorProcessAudio()
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
                const outputBuffer = makeAudioFrame(this.options)
                const inputBuffer = await processAudio()
                const valueBuffer = await valueProcessAudio()
                for (let i = 0; i < inputBuffer.length; ++i) {
                    outputBuffer[i] = inputBuffer[i] + valueBuffer[i]
                }
                return outputBuffer
            }
        })
    }
    delay(sampleCount) {
        const { samplesPerFrame } = this.options
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
        return new AudioProcess(this.options, async () => {
            const processAudio = await this.initialize()
            return frameCounter => {
                if (frameCounter < frameCount) {
                    const outputBuffer = makeAudioFrame(this.options)
                    return outputBuffer
                }
                return processAudio()
            }
        })
    }
    delaySamples(sampleCount) {
        const { samplesPerFrame } = this.options
        return new AudioProcess(this.options, async () => {
            const processAudio = await this.initialize()
            let inputBuffer
            return async () => {
                const outputBuffer = makeAudioFrame(this.options)
                if (inputBuffer) {
                    for (let i = 0; i < sampleCount; ++i) {
                        outputBuffer[i] = inputBuffer[i + samplesPerFrame - sampleCount]
                    }
                }
                inputBuffer = await processAudio()
                for (let i = 0; i < samplesPerFrame - sampleCount; ++i) {
                    outputBuffer[i + sampleCount] = inputBuffer[i]
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
        return new AudioProcess(
            this.options,
            async () => {
                const processAudio = await this.initialize()
                return async frameCounter => {
                    const outputBuffer = makeAudioFrame(this.options)
                    const inputBuffer = await processAudio()
                    for (let i = 0; i < inputBuffer.length; ++i) {
                        outputBuffer[i] = inputBuffer[i] * factor(frameCounter * this.options.samplesPerFrame + i)
                    }
                    return outputBuffer
                }
            },
            this.numberOfFrames
        )
    }
}

const a = 5
const b = -10
export const sigmoid = x => 1 / (1 + Math.pow(Math.E, a + b * x))
