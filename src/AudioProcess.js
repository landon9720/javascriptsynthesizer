import { context, makeAudioFrame } from './context'
import { sigmoid, samplesPerFrame, beats, parameterFunction } from './fundamentals'

export default class AudioProcess {
    constructor(processAudioFactory) {
        this.initialize = () => {
            this.frameCounter = 0
            const processAudio = processAudioFactory()
            this.processAudio = () => {
                const r = processAudio(this.frameCounter)
                ++this.frameCounter
                return r
            }
        }
        this.initialize()
    }
    sample(numberOfFrames) {
        const inputArray = new Float32Array(new ArrayBuffer(numberOfFrames * samplesPerFrame * 4))
        this.initialize()
        for (let i = 0; i < numberOfFrames; ++i) {
            const inputBuffer = this.processAudio().getChannelData(0)
            for (let j = 0; j < samplesPerFrame; ++j) {
                inputArray[i * samplesPerFrame + j] = inputBuffer[j]
            }
        }
        return new AudioProcess(() => {
            return frameCounter => {
                const { outputBuffer, output } = makeAudioFrame()
                for (let i = 0; i < output.length; ++i) {
                    output[i] = inputArray[frameCounter * samplesPerFrame + i]
                }
                return outputBuffer
            }
        })
    }
    toFunction() {
        let inputBuffer
        return sampleIndex => {
            if (sampleIndex % samplesPerFrame === 0) {
                inputBuffer = 0
            }
            if (!inputBuffer) {
                inputBuffer = this.processAudio().getChannelData(0)
            }
            return inputBuffer[sampleIndex % samplesPerFrame]
        }
    }
    multiply(factor) {
        factor = parameterFunction(factor)
        return new AudioProcess(() => {
            this.initialize()
            return frameCounter => {
                const { outputBuffer, output } = makeAudioFrame()
                const inputBuffer = this.processAudio().getChannelData(0)
                for (let i = 0; i < inputBuffer.length; ++i) {
                    const sampleIndex = frameCounter * samplesPerFrame + i
                    output[i] = inputBuffer[i] * factor(sampleIndex)
                }
                return outputBuffer
            }
        })
    }
    add(value) {
        value = parameterFunction(value)
        return new AudioProcess(() => {
            this.initialize()
            return frameCounter => {
                const { outputBuffer, output } = makeAudioFrame()
                const inputBuffer = this.processAudio().getChannelData(0)
                for (let i = 0; i < inputBuffer.length; ++i) {
                    const sampleIndex = frameCounter * samplesPerFrame + i
                    output[i] = inputBuffer[i] + value(sampleIndex)
                }
                return outputBuffer
            }
        })
    }
    delay(sampleCount) {
        const frameCount = Math.ceil(sampleCount / samplesPerFrame)
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
        return new AudioProcess(() => {
            this.initialize()
            return frameCounter => {
                if (frameCounter < frameCount) {
                    const { outputBuffer } = makeAudioFrame()
                    return outputBuffer
                }
                return this.processAudio()
            }
        })
    }
    delaySamples(sampleCount) {
        return new AudioProcess(() => {
            this.initialize()
            let inputBuffer
            return () => {
                const { outputBuffer, output } = makeAudioFrame()
                if (inputBuffer) {
                    for (let i = 0; i < sampleCount; ++i) {
                        output[i] = inputBuffer[i + samplesPerFrame - sampleCount]
                    }
                }
                inputBuffer = this.processAudio().getChannelData(0)
                for (let i = 0; i < samplesPerFrame - sampleCount; ++i) {
                    output[i + sampleCount] = inputBuffer[i]
                }
                return outputBuffer
            }
        })
    }
    loop(length) {
        return new AudioProcess(() => {
            this.initialize()
            return () => this.processAudio()
        })
    }
    adsr(
        {
            A = beats(1 / 4),
            D = beats(1 / 4),
            S = beats(1 / 4),
            R = beats(1 / 4),
            sustainLevel = 0.5,
            attackFunction = sigmoid,
            decayFunction = sigmoid,
            releaseFunction = sigmoid,
        } = {}
    ) {
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
        return new AudioProcess(() => {
            this.initialize()
            return frameCounter => {
                const { outputBuffer, output } = makeAudioFrame()
                const inputBuffer = this.processAudio().getChannelData(0)
                for (let i = 0; i < inputBuffer.length; ++i) {
                    output[i] = inputBuffer[i] * factor(frameCounter * samplesPerFrame + i)
                }
                return outputBuffer
            }
        }, this.numberOfFrames)
    }
}

// export const nil = new AudioProcess(() => {
//     return () => context.createBuffer(1, samplesPerFrame, 44100)
// })
