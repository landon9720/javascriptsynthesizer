import { SuperFactory } from './superFactory'
import AudioProcess, { audioProcessOptionsFactory } from './AudioProcess'
import fs from 'fs'

;(async function() {
    try {
        const options = audioProcessOptionsFactory()
        const { samplesPerFrame, samplesPerBeat, samplesPerSecond, basisFrequency } = options
        const {
            sin,
            square,
            saw,
            triangle,
            sum,
            mix,
            ordered,
            value,
            readFile,
            beats,
            note,
            matrix,
            sequencerToAudioProcess,
            nullAudioProcess,
        } = new SuperFactory(options)
        const js = fs.readFileSync('user.js', { encoding: 'utf-8' })
        const f = new Function(
            'console',
            'samplesPerFrame',
            'samplesPerBeat',
            'samplesPerSecond',
            'basisFrequency',
            'sin',
            'square',
            'saw',
            'triangle',
            'sum',
            'mix',
            'ordered',
            'value',
            'readFile',
            'beats',
            'note',
            'matrix',
            'sequencerToAudioProcess',
            'nullAudioProcess',
            js,
        )
        const tune = f(
            console,
            samplesPerFrame,
            samplesPerBeat,
            samplesPerSecond,
            basisFrequency,
            sin,
            square,
            saw,
            triangle,
            sum,
            mix,
            ordered,
            value,
            readFile,
            beats,
            note,
            matrix,
            sequencerToAudioProcess,
            nullAudioProcess,
        )
        if (!tune || !tune instanceof AudioProcess) throw new Error('user script must return AudioProcess')
        await tune.writeFile('tune.raw')
        process.exit(0)
    } catch (e) {
        console.error('exception', e)
        process.exit(1)
    }
})()
