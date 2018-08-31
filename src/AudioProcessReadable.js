import { Buffer } from 'buffer'
import { Readable } from 'stream'
import AudioProcess from './AudioProcess'

// adapts a AudioProcess for use as a stream source (eg write to file)
export default class AudioProcessReadable extends Readable {
    constructor(audioProcess, frameLength) {
        super()
        console.assert(audioProcess instanceof AudioProcess)
        console.assert(frameLength)
        this.audioProcess = audioProcess
        this.frameLength = frameLength
        this.frameCounter = 0
    }
    async _read() {
        let ok = true
        if (this.frameCounter === 0) {
            this.processAudio = await this.audioProcess.initialize()
        }
        if (ok && this.frameCounter++ < this.frameLength) {
            const outputBuffer = await this.processAudio()
            const data = Buffer.from(outputBuffer.buffer)
            ok = this.push(data)
        } else if (this.frameCounter > this.frameLength) {
            this.push(null)
        }
    }
}
