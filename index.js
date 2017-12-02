import _ from 'lodash'
const context = new AudioContext()
window.addEventListener('unload', () => context.close())
const F = context.sampleRate

class Monad {
    constructor(processAudio, numberOfFrames = Number.POSITIVE_INFINITY) {
        this.numberOfFrames = numberOfFrames
        this.initialize = () => {
            this.counter = 0
            const processAudioF = processAudio()
            this.processAudio = () => {
                if (this.counter < this.numberOfFrames) {
                    const r = processAudioF(this.counter, this.numberOfFrames)
                    ++this.counter
                    return r
                } else {
                    return context.createBuffer(1, 1024, 44100)
                }
            }
        }
        this.initialize()
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
        _.forEach(inputs, i => i.initialize())
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
    }, _.maxBy(inputs, i => i.numberOfFrames).numberOfFrames)

const seq = (...inputs) =>
    new Monad(() => {
        _.forEach(inputs, i => i.initialize())
        let i = 0
        let input = inputs[i]
        return () => {
            if (input.counter === input.numberOfFrames) {
                input = inputs[++i]
            }
            return input.processAudio()
        }
    }, _.sumBy(inputs, i => i.numberOfFrames))

const loop = (input, count = Number.POSITIVE_INFINITY) =>
    new Monad(() => {
        input.initialize()
        let i = 0
        return () => {
            if (input.counter === input.numberOfFrames && i < count) {
                input.initialize()
                ++i
            }
            return input.processAudio()
        }
    }, input.numberOfFrames * count)

const gain = (input, factor) =>
    new Monad(() => {
        input.initialize()
        return (counter, numberOfFrames) => {
            const outputBuffer = context.createBuffer(1, 1024, 44100)
            const output = outputBuffer.getChannelData(0)
            const inputBuffer = input.processAudio().getChannelData(0)
            for (let i = 0; i < inputBuffer.length; ++i) {
                output[i] += inputBuffer[i] * factor(counter * 1024 + i, numberOfFrames * 1024)
            }
            return outputBuffer
        }
    }, input.numberOfFrames)

const organ = (f, d) => {
    // const a = []
    // while (f < 3000) {
    //     f *= 2
    // }
    // while (f > 10) {
    //     a.push(sin(f, 0.1, d))
    //     f /= 2
    // }

    return seq(
        shave(trim(sin(f, 0.5, d))),
    )
}

const shave = (input, w = 60) => new Monad(() => {
    input.initialize()
    return (counter, numberOfFrames) => {
        if (counter === 0) {
            const outputBuffer = context.createBuffer(1, 1024, 44100)
            const output = outputBuffer.getChannelData(0)
            const inputBuffer = input.processAudio().getChannelData(0)
            for (let i = 0; i < inputBuffer.length; ++i) {
                output[i] += inputBuffer[i]
                if (i < w) {
                    output[i] *= i / w
                }
            }
            return outputBuffer
        }
        return input.processAudio()
    }
}, input.numberOfFrames)

const trim = (input, w = 60) => new Monad(() => {
    input.initialize()
    return (counter, numberOfFrames) => {
        if (counter < numberOfFrames - 1) {
            return input.processAudio()
        }
        const outputBuffer = context.createBuffer(1, 1024, 44100)
        const output = outputBuffer.getChannelData(0)
        const inputBuffer = input.processAudio().getChannelData(0)
        for (let i = 0; i < inputBuffer.length; ++i) {
            output[i] += inputBuffer[i]
            if (inputBuffer.length - i < w) {
                output[i] *= (inputBuffer.length - i) / w
            }
        }
        return outputBuffer
    }
}, input.numberOfFrames)

const fs = _.range(80, 2000, 30)
const tune = loop(seq(..._.map(fs, f => organ(f, 1))))

scriptNodeFactory(({ outputBuffer }) => {
    const tuneOutputBuffer =
        tune.counter < tune.numberOfFrames ? tune.processAudio() : context.createBuffer(1, 1024, 44100)
    const input = tuneOutputBuffer.getChannelData(0)
    const output = outputBuffer.getChannelData(0)
    for (let i = 0; i < 1024; ++i) {
        output[i] = input[i]
    }
}).connect(context.destination)
