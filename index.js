import _ from 'lodash'
const context = new AudioContext()
const F = context.sampleRate

const scriptNodeFactory = (audioprocess, inputChannels = 0, outputChannels = 1) => {
    const a = context.createScriptProcessor(
        0, // default buffer size
        inputChannels,
        outputChannels
    )
    a.onaudioprocess = e => {
        audioprocess(e)
        return e
    }
    return a
}

const sin = (f = 440, A = 1.0) => {
    const omega = 2 * Math.PI * f / F
    let y0 = 0
    let y1 = Math.sin(omega)
    const c = 2 * Math.cos(omega)
    const k = 0.9999
    return scriptNodeFactory(e => {
        const output = e.outputBuffer.getChannelData(0)
        for (let i = 0; i < output.length; i += 2) {
            output[i + 0] = y0 * A
            output[i + 1] = y1 * A
            y0 = c * y1 - k * y0
            y1 = c * y0 - k * y1
        }
    })
}

const sum = (...audioNodes) => {
    const result = scriptNodeFactory(e => {
        const output = e.outputBuffer.getChannelData(0)
        for (let i = 0; i < output.length; ++i) {
            output[i] = 0
        }
        const inputs = _.map(audioNodes, audioNode =>
            audioNode
                .onaudioprocess({
                    outputBuffer: context.createBuffer(
                        e.outputBuffer.numberOfChannels,
                        e.outputBuffer.length,
                        e.outputBuffer.sampleRate
                    ),
                })
                .outputBuffer.getChannelData(0)
        )
        _.forEach(inputs, input => {
            for (let i = 0; i < input.length; ++i) {
                output[i] += input[i]
            }
        })
    })
    return result
}

sum(sin(300, 0.5), sin(600, 0.5), sin(900, 0.5)).connect(context.destination)

setTimeout(() => context.close(), 10000)
