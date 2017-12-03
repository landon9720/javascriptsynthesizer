export const context = new AudioContext()
export const F = context.sampleRate

export function play(tune) {
    scriptNodeFactory(({ outputBuffer }) => {
        const tuneOutputBuffer =
            tune.counter < tune.numberOfFrames ? tune.processAudio() : context.createBuffer(1, 1024, 44100)
        const input = tuneOutputBuffer.getChannelData(0)
        const output = outputBuffer.getChannelData(0)
        for (let i = 0; i < 1024; ++i) {
            output[i] = input[i]
        }
    }).connect(context.destination)
}

window.addEventListener('unload', () => context.close())
