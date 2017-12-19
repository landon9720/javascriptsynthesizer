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
    repeat(times) {
        return new Sequencer(() => {
            const inputSequence = this.processSequence()
            const totalDuration = _.chain(inputSequence)
                .map(e => e.time + e.duration)
                .max()
                .value()
            console.log('totalDuration', totalDuration)
            const result = []
            for (let i = 0; i < times; ++i) {
                result.push(...inputSequence.map(e => _.extend({}, e, { time: i * totalDuration + e.time })))
            }
            return result
        })
    }
    toAudioProcess(audioProcessFactory) {
        const sequence = this.processSequence()
        return sum(..._.map(sequence, e => audioProcessFactory(e).delay(e.time)))
    }
}
