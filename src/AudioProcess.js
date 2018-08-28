import { makeAudioFrame } from './context'
import { sigmoid, parameterFunction } from './fundamentals'

export default class AudioProcess {
    constructor(options, processAudioFactory) {
        console.assert(options)
        const { samplesPerFrame, samplesPerBeat, samplesPerSecond } = this.options = options
        console.assert(samplesPerFrame)
        console.assert(samplesPerBeat)
        console.assert(samplesPerSecond)
        this.frameCounter = 0
        this.initialize = () => {
            this.frameCounter = 0
            const processAudio = processAudioFactory()
            this.processAudio = () => processAudio(this.frameCounter++)
        }
        this.initialize()
    }
    async sample(numberOfFrames) {
        const { samplesPerFrame } = this.options
        const inputArray = new Float32Array(new ArrayBuffer(numberOfFrames * samplesPerFrame * 4))
        this.initialize()
        for (let i = 0; i < numberOfFrames; ++i) {
            const inputBuffer = await this.processAudio()
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
    toFunction() {
        let inputBuffer
        return sampleIndex => {
            if (sampleIndex % this.options.samplesPerFrame === 0) {
                inputBuffer = 0
            }
            if (!inputBuffer) {
                inputBuffer = this.processAudio()
            }
            return inputBuffer[sampleIndex % samplesPerFrame]
        }
    }
    multiply(factor) {
        factor = parameterFunction(factor)
        return new AudioProcess(this.options, () => {
            this.initialize()
            return async frameCounter => {
                const outputBuffer = makeAudioFrame(this.options)
                const inputBuffer = await this.processAudio()
                for (let i = 0; i < inputBuffer.length; ++i) {
                    const sampleIndex = frameCounter * this.options.samplesPerFrame + i
                    outputBuffer[i] = inputBuffer[i] * factor(sampleIndex)
                }
                return outputBuffer
            }
        })
    }
    add(value) {
        value = parameterFunction(value)
        return new AudioProcess(this.options, () => {
            this.initialize()
            return async frameCounter => {
                const outputBuffer = makeAudioFrame(this.options)
                const inputBuffer = await this.processAudio()
                for (let i = 0; i < inputBuffer.length; ++i) {
                    const sampleIndex = frameCounter * this.options.samplesPerFrame + i
                    outputBuffer[i] = inputBuffer[i] + value(sampleIndex)
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
        return new AudioProcess(this.options, () => {
            this.initialize()
            return frameCounter => {
                if (frameCounter < frameCount) {
                    const outputBuffer = makeAudioFrame(this.options)
                    return outputBuffer
                }
                return this.processAudio()
            }
        })
    }
    delaySamples(sampleCount) {
        const { samplesPerFrame } = this.options
        return new AudioProcess(this.options, () => {
            this.initialize()
            let inputBuffer
            return () => {
                const outputBuffer = makeAudioFrame(this.options)
                if (inputBuffer) {
                    for (let i = 0; i < sampleCount; ++i) {
                        outputBuffer[i] = inputBuffer[i + samplesPerFrame - sampleCount]
                    }
                }
                inputBuffer = this.processAudio()
                for (let i = 0; i < samplesPerFrame - sampleCount; ++i) {
                    outputBuffer[i + sampleCount] = inputBuffer[i]
                }
                return outputBuffer
            }
        })
    }
    adsr(
        {
            A = beats(1 / 8),
            D = beats(0 / 8),
            S = beats(2 / 8),
            R = beats(1 / 8),
            sustainLevel = 1,
            attackFunction = sigmoid,
            decayFunction = sigmoid,
            releaseFunction = sigmoid,
        } = {}
    ) {
        console.assert(_.every([ A, D, S, R ], a => a >= 0))
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
        return new AudioProcess(this.options, () => {
            this.initialize()
            return async frameCounter => {
                const outputBuffer = makeAudioFrame(this.options)
                const inputBuffer = await this.processAudio()
                for (let i = 0; i < inputBuffer.length; ++i) {
                    outputBuffer[i] = inputBuffer[i] * factor(frameCounter * this.options.samplesPerFrame + i)
                }
                return outputBuffer
            }
        }, this.numberOfFrames)
    }
}
