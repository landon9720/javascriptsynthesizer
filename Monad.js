export default class Monad {
    constructor(processAudio, numberOfFrames = Number.POSITIVE_INFINITY) {
        this.numberOfFrames = numberOfFrames
        this.initialize = () => {
            this.counter = 0
            const processAudioF = processAudio()
            this.processAudio = () => {
                const r = processAudioF(this.counter, this.numberOfFrames)
                ++this.counter
                return r
            }
        }
        this.initialize()
    }
}
