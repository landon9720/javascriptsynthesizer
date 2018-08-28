import { Buffer } from 'buffer'
import { Readable } from 'stream'
import { samplesPerFrame } from './fundamentals'

export default class AudioProcessReader extends Readable {
    constructor(audioProcess, frameLength) {
        super()
        console.assert(audioProcess)
        console.assert(frameLength)
        this.audioProcess = audioProcess
        this.frameLength = frameLength
        this.frameCounter = 0
    }
    async _read() {
        let ok = true
        while (ok && this.frameCounter++ < this.frameLength) {
            console.log(
                `AudioProcessReader _read frameLength=${this.frameLength} frameCounter=${this.frameCounter} ${Math.round((this.frameCounter / this.frameLength) * 100)}%`
            )
            const outputBuffer = await this.audioProcess.processAudio()
            const data = Buffer.from(outputBuffer.buffer)
            ok = this.push(data)
        }
        if (this.frameCounter >= this.frameLength) {
            console.log('this.push(null)')
            this.push(null)
        }
    }
}
