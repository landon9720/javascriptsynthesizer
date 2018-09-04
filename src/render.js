import { SuperFactory } from './SuperFactory'
import AudioProcess, { audioProcessOptionsFactory } from './AudioProcess'
import fs from 'fs'
;(async function() {
    try {
        const options = audioProcessOptionsFactory(120)
        const { samplesPerFrame, samplesPerBeat, samplesPerSecond, basisFrequency } = options
        const {
            sin,
            square,
            sum,
            mix,
            ordered,
            value,
            readFile,
            beats,
            note,
            sequencer,
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
            'sum',
            'mix',
            'ordered',
            'value',
            'readFile',
            'beats',
            'note',
            'sequencer',
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
            sum,
            mix,
            ordered,
            value,
            readFile,
            beats,
            note,
            sequencer,
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
