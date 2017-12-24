import _ from 'lodash'
import { context, F } from './context'
import AudioProcess from './AudioProcess'
import Sequencer from './Sequencer'

export function sin(f = 440, A = 1.0, numberOfFrames) {
    return new AudioProcess(() => {
        const omega = 2 * Math.PI * f / F
        let y0 = 0
        let y1 = Math.sin(omega)
        const c = 2 * Math.cos(omega)
        const k = 1
        return (counter, numberOfFrames) => {
            console.assert(counter < numberOfFrames)
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
}

export function square(f = 440, A = 1.0, numberOfFrames, dutyFunction = () => 0.5) {
    const period = F / f
    let absoluteIndex = 0
    return new AudioProcess(() => {
        return (counter, numberOfFrames) => {
            console.assert(counter < numberOfFrames)
            const outputBuffer = context.createBuffer(1, 1024, 44100)
            const output = outputBuffer.getChannelData(0)
            for (let i = 0; i < output.length; ++i) {
                const b = (counter + absoluteIndex++) % period
                const c = b / period
                output[i] = (c < dutyFunction((counter * 1024 + i) / (numberOfFrames * 1024)) ? 1 : -1) * A
            }
            return outputBuffer
        }
    }, numberOfFrames)
}

export function saw(f = 440, A = 1.0, numberOfFrames) {
    const period = F / f
    let absoluteIndex = 0
    return new AudioProcess(() => {
        return (counter, numberOfFrames) => {
            console.assert(counter < numberOfFrames)
            const outputBuffer = context.createBuffer(1, 1024, 44100)
            const output = outputBuffer.getChannelData(0)
            for (let i = 0; i < output.length; ++i) {
                const b = (counter + absoluteIndex++) % period
                const c = b / period
                output[i] = c * A
            }
            return outputBuffer
        }
    }, numberOfFrames)
}

export function triangle(f = 440, A = 1.0, numberOfFrames) {
    const period = F / f
    let absoluteIndex = 0
    return new AudioProcess(() => {
        return (counter, numberOfFrames) => {
            console.assert(counter < numberOfFrames)
            const outputBuffer = context.createBuffer(1, 1024, 44100)
            const output = outputBuffer.getChannelData(0)
            for (let i = 0; i < output.length; ++i) {
                const b = (counter + absoluteIndex++) % period
                const c = b / period
                const d = 0
                output[i] = (c < 0.5 ? 1 : -1) * A
            }
            return outputBuffer
        }
    }, numberOfFrames)
}

export function sum(...inputs) {
    const numberOfFrames = _.reduce(inputs, (max, i) => {
        if (max === Number.POSITIVE_INFINITY || i === Number.POSITIVE_INFINITY) {
            return Number.POSITIVE_INFINITY
        }
        return Math.max(max, i.numberOfFrames)
    }, 0)
    return new AudioProcess(() => {
        _.forEach(inputs, i => i.initialize())
        return (counter, numberOfFrames) => {
            console.assert(counter < numberOfFrames)
            const outputBuffer = context.createBuffer(1, 1024, 44100)
            const output = outputBuffer.getChannelData(0)
            _.forEach(inputs, input => {
                if (input.counter < input.numberOfFrames) {
                    const inputBuffer = input.processAudio().getChannelData(0)
                    for (let i = 0; i < inputBuffer.length; ++i) {
                        output[i] += inputBuffer[i]
                    }
                }
            })
            return outputBuffer
        }
    }, numberOfFrames)
}

export function seq(...inputs) {
    return new AudioProcess(() => {
        _.forEach(inputs, i => i.initialize())
        let i = 0
        let input = inputs[i]
        return (counter, numberOfFrames) => {
            console.assert(counter < numberOfFrames)
            if (input.counter === input.numberOfFrames) {
                input = inputs[++i]
            }
            return input.processAudio()
        }
    }, _.sumBy(inputs, i => i.numberOfFrames))
}

export function loop(input, count = Number.POSITIVE_INFINITY) {
    return new AudioProcess(() => {
        input.initialize()
        let i = 0
        return (counter, numberOfFrames) => {
            console.assert(counter < numberOfFrames)
            if (input.counter === input.numberOfFrames && i < count) {
                input.initialize()
                ++i
            }
            return input.processAudio()
        }
    }, input.numberOfFrames * count)
}

export function sequence(events) {
    return new Sequencer(() => events)
}
