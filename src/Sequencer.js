import { sum } from './factories'

export default class Sequencer {
    constructor(processSequence) {
        this.processSequence = processSequence
    }
    mix(sequencer) {
        return new Sequencer(() => {
            return [...this.processSequence(), ...sequencer.processSequence()]
        })
    }
    map(mapEvent) {
        return new Sequencer(() => {
            return this.processSequence().map(mapEvent)
        })
    }
    toAudioProcess(audioProcessFactory) {
        const sequence = this.processSequence()
        return sum(..._.map(sequence, e => audioProcessFactory(e).delay(e.time)))
    }
}
