export default class Instrument {
    constructor(audioProcessFactoryFactory) {
        this.initialize = () => {
            this.audioProcessFactory = audioProcessFactoryFactory()
        }
        this.initialize()
    }
}

import { beats, note } from './fundamentals'
import { sin, sum } from './factories'

export const bell = new Instrument(() => {
    let duration = beats(1)
    return e => {
        duration = e.duration || duration
        return sin(note(e.value)).multiply(0.7)
    }
        
    //         sum(sin(note(e.value)), sin(note(e.value - 12)), sin(note(e.value + 24)))
    //         .adsr({
    //             A: beats(0.1),
    //             D: beats(0.1),
    //             S: beats(duration) - beats(0.3),
    //             R: beats(0.1),
    //         })
    //         .multiply(0.3)
    // }
})