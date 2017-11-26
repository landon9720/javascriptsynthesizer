const context = new AudioContext()
const a = context.createScriptProcessor(0, 0, 1)

const f = 440000
const omega = 2 * Math.PI * f / context.sampleRate

a.onaudioprocess = e => {
    const output = e.outputBuffer.getChannelData(0)
    for (let i = 0; i < output.length; ++i) {
        const n = context.sampleRate * e.playbackTime + i
        output[i] = Math.sin(omega * n) * 2 - 1
    }
}

a.connect(context.destination)
setTimeout(() => context.close(), 1000)
