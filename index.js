import _ from 'lodash'
const context = new AudioContext()
window.addEventListener('unload', () => context.close())
const F = context.sampleRate

class Monad {
    constructor(processAudio, numberOfFrames = Number.POSITIVE_INFINITY) {
        this.numberOfFrames = numberOfFrames
        this.counter = 0
        const processAudioF = processAudio()
        this.processAudio = () => {
            if (this.counter < this.numberOfFrames) {
                const r = processAudioF()
                ++this.counter
                return r
            } else {
                return context.createBuffer(1, 1024, 44100)
            }
        }
    }
}

const scriptNodeFactory = (processAudio, inputChannels = 0, outputChannels = 1) => {
    const a = context.createScriptProcessor(1024, inputChannels, outputChannels)
    a.onaudioprocess = e => {
        processAudio(e)
        return e
    }
    return a
}

const sin = (f = 440, A = 1.0, numberOfFrames) =>
    new Monad(() => {
        const omega = 2 * Math.PI * f / F
        let y0 = 0
        let y1 = Math.sin(omega)
        const c = 2 * Math.cos(omega)
        const k = 1
        return () => {
            const outputBuffer = context.createBuffer(1, 1024, 44100)
            const output = outputBuffer.getChannelData(0)
            for (let i = 0; i < output.length; i += 2) {
                output[i + 0] = y0 * A
                output[i + 1] = y1 * A
                y0 = c * y1 - k * y0
                y1 = c * y0 - k * y1
            }
            return outputBuffer
        }
    }, numberOfFrames)

const sum = (...inputs) =>
    new Monad(() => {
        return () => {
            const outputBuffer = context.createBuffer(1, 1024, 44100)
            const output = outputBuffer.getChannelData(0)
            _.forEach(inputs, input => {
                const inputBuffer = input.processAudio().getChannelData(0)
                for (let i = 0; i < inputBuffer.length; ++i) {
                    output[i] += inputBuffer[i]
                }
            })
            return outputBuffer
        }
    })

const a = []
for (let f = 60; f < 3000; f *= 2) {
    a.push(sin(f * (1 + 0.0 / 12.0), 0.01, 100))
    a.push(sin(f * (1 + 4.0 / 12.0), 0.01, 200))
    a.push(sin(f * (1 + 8.0 / 12.0), 0.01, 300))
}

const tune = sum(...a, sin(120, 0.1))

scriptNodeFactory(({ outputBuffer }) => {
    const tuneOutputBuffer = tune.processAudio()
    const input = tuneOutputBuffer.getChannelData(0)
    const output = outputBuffer.getChannelData(0)
    for (let i = 0; i < 1024; ++i) {
        output[i] = input[i]
    }
}).connect(context.destination)
