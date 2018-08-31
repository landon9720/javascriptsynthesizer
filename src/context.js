export function makeAudioFrame(audioProcessOptions) {
    const { samplesPerFrame } = audioProcessOptions
    console.assert(samplesPerFrame)
    return new Float32Array(samplesPerFrame)
}
