import { superFactory } from './superFactory'

export function instrumentFactoryFactory(audioProcessOptions) {
    const { samplesPerFrame, samplesPerBeat, samplesPerSecond, basisFrequency = 440 } = audioProcessOptions
    console.assert(samplesPerFrame)
    console.assert(samplesPerBeat)
    console.assert(samplesPerSecond)
    console.assert(basisFrequency)
    return {
        bell: () => {
            const { sin, note, value } = superFactory(audioProcessOptions)
            let duration = 1
            return e => {
                duration = e.duration || duration
                return sin(value(note(e.value))).adsr({ duration: duration * samplesPerBeat })
            }
        },
    }
}
