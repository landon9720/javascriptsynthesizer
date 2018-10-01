import { SuperFactory } from './superFactory'
import AudioProcess from './AudioProcess'
import Sequencer from './Sequencer'
import fs from 'fs'
import { samplesPerFrame } from './buffer'
import prettyMs from 'pretty-ms'

const samplesPerSecond = 44100
const basisFrequency = 261.6 // Middle C
const offset = 0
const options = {
    samplesPerSecond,
    samplesPerBeat: null, // set below by bpm call
    basisFrequency,
    offset,
}

const {
    sin,
    square,
    saw,
    triangle,
    whitenoise,
    sum,
    mix,
    ordered,
    value,
    readFile,
    bpm,
    beats,
    note,
    matrix,
    sequencerToAudioProcess,
    nullAudioProcess,
} = new SuperFactory(options)

bpm(100) // default beats per minute

const channelInstrumentMap = {}
function addInstrument(channelName, instrumentNameOrFunction) {
    console.assert(_.isString(channelName), 'channel name must be string')
    console.assert(
        !instrumentNameOrFunction ||
            typeof instrumentNameOrFunction === 'string' ||
            typeof instrumentNameOrFunction === 'function',
        'instrumentNameOrFunction must be string or function'
    )
    if (!instrumentNameOrFunction) {
        instrumentNameOrFunction = channelName
    }
    if (_.isString(instrumentNameOrFunction)) {
        const sourceExpression = fs.readFileSync(`${instrumentNameOrFunction}.js`, { encoding: 'utf-8' })
        const instrument = invokeUserScript(`return (function(){return(${sourceExpression})})()`)
        console.assert(typeof instrument === 'function', `instrument expression must yield an instrument ${instrument}`)
        addInstrument(channelName, instrument)
        return
    }
    console.assert(instrumentNameOrFunction && _.isFunction(instrumentNameOrFunction), 'instrumentNameOrFunction')
    if (!channelInstrumentMap[channelName]) {
        channelInstrumentMap[channelName] = []
    }
    channelInstrumentMap[channelName].push(instrumentNameOrFunction)
}

function invokeUserScript(userScript) {
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
        'whitenoise',
        'sum',
        'mix',
        'ordered',
        'value',
        'readFile',
        'bpm',
        'beats',
        'note',
        'matrix',
        'sequencerToAudioProcess',
        'nullAudioProcess',
        'addInstrument',
        userScript
    )
    return f(
        console,
        samplesPerFrame,
        options.samplesPerBeat,
        samplesPerSecond,
        basisFrequency,
        sin,
        square,
        saw,
        triangle,
        whitenoise,
        sum,
        mix,
        ordered,
        value,
        readFile,
        bpm,
        beats,
        note,
        matrix,
        sequencerToAudioProcess,
        nullAudioProcess,
        addInstrument,
    )
}

;(async function() {
    try {
        const arg = process.argv[2]
        console.assert(_.isString(arg) && arg.length > 0, 'filename argument required')
        const js = fs.readFileSync(arg, { encoding: 'utf-8' })
        let tune = invokeUserScript(js)
        if (tune) {
            if (tune instanceof Sequencer) {
                tune = sequencerToAudioProcess(tune, event => {
                    const { channel } = event
                    return mix(..._.map(channelInstrumentMap[channel], instrument => instrument(event)))
                })
            }
            if (tune instanceof AudioProcess) {
                tune = tune.gain(.9)
                const fn = `${arg}.raw`
                console.log(`writing file ${fn}`)
                const t0 = new Date()
                await tune.writeFile(fn)
                console.log(`took ${prettyMs((new Date()) - t0)} ms`)
            } else {
                throw new Error('user script must return AudioProcess or Sequencer')
            }
        }
        process.exit(0)
    } catch (e) {
        console.error('exception', e)
        process.exit(1)
    }
})()
