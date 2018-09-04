import { Buffer } from 'buffer'
import { Readable } from 'stream'
import AudioProcess from './AudioProcess'

// adapts a AudioProcess for use as a stream source (eg write to file)
export default class AudioProcessReadable extends Readable {
    constructor(audioProcess) {
        super()
        console.assert(audioProcess instanceof AudioProcess, 'audioProcess is not AudioProcess')
        this.audioProcess = audioProcess
    }
    async _read() {
        if (!this.processAudio) {
            this.processAudio = await this.audioProcess.initialize()
        }
        const outputBuffer = await this.processAudio()
        if (!outputBuffer) {
            this.push(null)
            return
        }
        const data = Buffer.from(outputBuffer.buffer)
        this.push(data)
    }
}
