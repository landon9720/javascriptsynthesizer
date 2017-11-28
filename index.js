const context = new AudioContext()
const a = context.createScriptProcessor(0, 0, 1)

const f = 440
const omega = 2 * Math.PI * f / context.sampleRate
let y0 = 0
let y1 = Math.sin(omega)
const c = 2 * Math.cos(omega)
const k = .9999

a.onaudioprocess = e => {
    const output = e.outputBuffer.getChannelData(0)
    for (let i = 0; i < output.length; i += 2) {
        output[i + 0] = y0
        output[i + 1] = y1
        y0 = c * y1 - k * y0
        y1 = c * y0 - k * y1
    }
}

a.connect(context.destination)
setTimeout(() => context.close(), 10000)
