import { Buffer } from 'buffer'
import { Readable } from 'stream'
import AudioProcess from './AudioProcess'
import { samplesPerFrame } from './buffer'

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
        console.assert(outputBuffer instanceof Float32Array, `outputBuffer instanceof Float32Array`)
        const data = Buffer.from(outputBuffer.buffer.slice(), null)
        console.assert(data.length === samplesPerFrame * 4, 'data.length === samplesPerFrame * 4')
        this.push(data)
    }
}
