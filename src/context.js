export const samplesPerSecond = 8000
// export const samplesPerSecond = 44100

export function makeAudioFrame(audioProcessOptions) {
    const { samplesPerFrame } = audioProcessOptions
    console.assert(samplesPerFrame)
    return new Float32Array(samplesPerFrame)
}
