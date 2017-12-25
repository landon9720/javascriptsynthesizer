import { context } from './context'
import { sigmoid } from './fundamentals'

export default class AudioProcess {
    constructor(processAudio, numberOfFrames = Number.POSITIVE_INFINITY) {
        this.numberOfFrames = numberOfFrames
        this.initialize = () => {
            this.counter = 0
            const processAudioF = processAudio()
            this.processAudio = () => {
                const r = processAudioF(this.counter, this.numberOfFrames)
                ++this.counter
                return r
            }
        }
        this.initialize()
    }
    sample() {
        console.assert(this.numberOfFrames !== Number.POSITIVE_INFINITY)
        const inputArray = new Float32Array(new ArrayBuffer(this.numberOfFrames * 1024 * 4))
        this.initialize()
        for (let i = 0; i < this.numberOfFrames; ++i) {
            const inputBuffer = this.processAudio().getChannelData(0)
            for (let j = 0; j < 1024; ++j) {
                inputArray[i * 1024 + j] = inputBuffer[j]
            }
        }
        return new AudioProcess(() => {
            return (counter, numberOfFrames) => {
                console.assert(counter < numberOfFrames)
                const outputBuffer = context.createBuffer(1, 1024, 44100)
                const output = outputBuffer.getChannelData(0)
                for (let i = 0; i < output.length; ++i) {
                    output[i] = inputArray[counter * 1024 + i]
                }
                return outputBuffer
            }
        }, this.numberOfFrames)
    }
    gain(factor) {
        return new AudioProcess(() => {
            this.initialize()
            return (counter, numberOfFrames) => {
                console.assert(counter < numberOfFrames)
                const outputBuffer = context.createBuffer(1, 1024, 44100)
                const output = outputBuffer.getChannelData(0)
                const inputBuffer = this.processAudio().getChannelData(0)
                for (let i = 0; i < inputBuffer.length; ++i) {
                    output[i] += inputBuffer[i] * factor(counter * 1024 + i, numberOfFrames * 1024)
                }
                return outputBuffer
            }
        }, this.numberOfFrames)
    }
    delay(frameDelayCount) {
        return new AudioProcess(() => {
            this.initialize()
            return (counter, numberOfFrames) => {
                console.assert(counter < numberOfFrames)
                if (counter < frameDelayCount) {
                    return context.createBuffer(1, 1024, 44100)
                }
                return this.processAudio()
            }
        }, frameDelayCount + this.numberOfFrames)
    }
    delayFine(sampleDelayCount) {
        return new AudioProcess(() => {
            this.initialize()
            let inputBuffer
            return (counter, numberOfFrames) => {
                console.assert(counter < numberOfFrames)
                const outputBuffer = context.createBuffer(1, 1024, 44100)
                const output = outputBuffer.getChannelData(0)
                if (inputBuffer) {
                    for (let i = 0; i < sampleDelayCount; ++i) {
                        output[i] = inputBuffer[i + 1024 - sampleDelayCount]
                    }
                }
                if (counter < this.numberOfFrames) {
                    inputBuffer = this.processAudio().getChannelData(0)
                    for (let i = 0; i < 1024 - sampleDelayCount; ++i) {
                        output[i + sampleDelayCount] = inputBuffer[i]
                    }
                }
                return outputBuffer
            }
        }, this.numberOfFrames + 1)
    }
    adsr(
        {
            A = 3000, // attack duration in samples
            D = 3000, // decay duration in samples
            S = .2, // sustain level
            R = 3000, // release duration in samples
            duration = 40, // overall duration in frames
            attackFunction = sigmoid,
            decayFunction = sigmoid,
            releaseFunction = sigmoid,
        } = {}
    ) {
        const sustain = duration * 1024 - A - D - R
        const factor = sampleNumber => {
            if (sampleNumber < A) {
                return 1 * attackFunction(sampleNumber / A)
            }
            if (sampleNumber < A + D) {
                return 1 - (1 - S) * decayFunction((sampleNumber - A) / D)
            }
            if (sampleNumber < A + D + sustain) {
                return S
            }
            if (sampleNumber < A + D + sustain + R) {
                return S * releaseFunction((A + D + sustain + R - sampleNumber) / R)
            }
            console.assert()
        }
        return new AudioProcess(() => {
            this.initialize()
            return (counter, numberOfFrames) => {
                console.assert(counter < numberOfFrames)
                const outputBuffer = context.createBuffer(1, 1024, 44100)
                const output = outputBuffer.getChannelData(0)
                const inputBuffer = this.processAudio().getChannelData(0)
                for (let i = 0; i < inputBuffer.length; ++i) {
                    output[i] += inputBuffer[i] * factor(counter * 1024 + i)
                }
                return outputBuffer
            }
        }, duration)
    }
}

export const nil = new AudioProcess(() => {
    return () => context.createBuffer(1, 1024, 44100)
})
