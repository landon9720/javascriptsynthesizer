import { SuperFactory } from './superFactory'
import AudioProcess from './AudioProcess'
import Sequencer, { Event } from './Sequencer'
import fs from 'fs'
import { samplesPerFrame } from './buffer'
import parser from './parser'
import args from 'args'
import { printStats } from './stats'

const samplesPerSecond = 44100
const basisFrequency = 261.6 // Middle C
const offset = 0
const options = {
    samplesPerSecond,
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
    sequence,
    value,
    readFile,
    bpm,
    note,
    nullAudioProcess,
} = new SuperFactory(options)

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
        'sequence',
        'value',
        'readFile',
        'bpm',
        'note',
        'nullAudioProcess',
        userScript
    )
    f(
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
        sequence,
        value,
        readFile,
        bpm,
        note,
        nullAudioProcess
    )
}

function charCodeValueInterpreter(charCode) {
    if (charCode >= 48 && charCode <= 57) {
        // numbers
        return charCode - 48
    } else if (charCode >= 97 && charCode <= 122) {
        // lower-case letters continue from 10
        return charCode - 87
    } else if (charCode === 32 || !charCode) {
        // space
        return null
    } else {
        console.assert(true, `invalid charCode ${charCode}`)
    }
}

function invokeMatrix(matrix, matrixMap) {
    const duration = matrix.duration
    console.assert(_.isInteger(duration), 'duration must be integer')
    const events = []
    let channel
    const carry = {}
    for (let i = 0; i < duration; ++i) {
        let event
        matrix.datarows.forEach(row => {
            if (row.key.startsWith('+')) {
                // modify above event
                let metaKey = row.key.slice(1)
                console.assert(metaKey, 'metaKey')
                let metaValue = row.input.charCodeAt(i)
                if (!_.isUndefined(metaValue)) {
                    metaValue = charCodeValueInterpreter(metaValue)
                    if (!_.isNull(metaValue)) {
                        if (event) {
                            event = _.assign(event, { [metaKey]: metaValue })
                        }
                        carry[channel] = carry[channel] || {}
                        carry[channel][metaKey] = metaValue
                    }
                }
            } else {
                const ix1 = row.key.indexOf('.')
                const ix2 = row.key.indexOf('.', ix1 + 1)
                console.assert(
                    (ix1 === -1 && ix2 === -1) || ix1 + 2 === ix2,
                    `!ix1 && !ix2 || ix1 + 2 === ix2 ${row.key} ${ix1} ${ix2}`
                )
                const defaults = {
                    duration: 1,
                }
                if (ix1 !== -1 && ix2 !== -1) {
                    // channel.value.metakey-metavalue
                    channel = row.key.slice(0, ix1)
                    console.assert(channel, 'channel')
                    let value = row.key.charCodeAt(ix1 + 1)
                    console.assert(!_.isNull(value), '!_.isNull(value) 1')
                    value = charCodeValueInterpreter(value)
                    console.assert(!_.isNull(value), '!_.isNull(value) 2')
                    let metaKey = row.key.slice(ix2 + 1)
                    console.assert(metaKey, 'metaKey')
                    let metaValue = row.input.charCodeAt(i)
                    if (!_.isUndefined(metaValue)) {
                        metaValue = charCodeValueInterpreter(metaValue)
                        if (!_.isNull(metaValue)) {
                            if (event) {
                                events.push(event)
                            }
                            event = new Event(defaults, carry[channel], {
                                time: i,
                                channel,
                                value,
                                [metaKey]: metaValue,
                            })
                        }
                    }
                } else {
                    // channel-value
                    channel = row.key
                    let value = row.input.charCodeAt(i)
                    if (!_.isUndefined(value)) {
                        value = charCodeValueInterpreter(value)
                        if (!_.isNull(value)) {
                            if (event) {
                                events.push(event)
                            }
                            event = new Event(defaults, carry[channel], { time: i, channel, value })
                        }
                    }
                }
            }
        })
        if (event) {
            events.push(event)
        }
    }
    const sequencer = new Sequencer(() => events, matrix.duration, 125)
    const referenceMatrix = name => {
        const m = matrixMap[name]
        if (!m) {
            throw new Error(`matrix ${name} is not defined`)
        }
        return invokeMatrix(m)
    }
    return matrix.metarows.reduce((sequencer, metarow) => {
        switch (metarow.symbol) {
            case 'bpm': return sequencer.beatsPerMinute(Number(metarow.value))
            case 'multiply': return sequencer.scale(Number(metarow.value))
            case 'divide': return sequencer.scale(1 / Number(metarow.value))
            case 'loop': return sequencer.loop(Number(metarow.value))
            case 'trigger1': return sequencer.trigger1(referenceMatrix(metarow.value))
            case 'trigger2': return sequencer.trigger2(referenceMatrix(metarow.value))
            case 'transpose': return sequencer.transpose(referenceMatrix(metarow.value))
        }
        throw new Error(`unexpected metarow symbol ${metarow.symbol}`)
    }, sequencer)
}

function sequencerToAudioProcess(sequencer, eventToAudioProcess) {
    const samplesPerBeat = Math.round((samplesPerSecond * 60) / sequencer.bpm)
    if (eventToAudioProcess instanceof AudioProcess) {
        const _i = eventToAudioProcess
        eventToAudioProcess = () => _i
    }
    const events = sequencer.processSequence()
    let audioProcess = mix(
        ..._.map(events, e => {
            const e2 = new Event(e, {
                time: Math.ceil(e.time * samplesPerBeat),
                duration: Math.ceil(e.duration * samplesPerBeat)
            })
            return eventToAudioProcess(e2).delay(e2.time)
        })
    )
    const durationSamples = Math.ceil(sequencer.duration * samplesPerBeat)
    audioProcess = audioProcess.duration(durationSamples)
    return audioProcess
}

; (async function () {
    try {
        args.option(['i', 'inputFileName'], 'Input file name')
        args.option(['o', 'outputFileName'], 'Name of audio file to write (wav or mp3)', 'audio.wav')
        args.option(['a', 'audioProcessLiteral'], 'AudioProcess script literal to render to file')
        args.option(['q', 'quiet'], 'Do not write to stdout')
        const { inputFileName, audioProcessLiteral, outputFileName, quiet } = args.parse(process.argv, { name: 'zigzag', exit: true, version: false })
        let audioProcess
        if (inputFileName && inputFileName.endsWith('.zz')) {
            const matrixes = parser(fs.readFileSync(inputFileName, { encoding: 'utf-8' }))
            const master = matrixes.master
            if (!master) {
                throw new Error(`.zz file requires master matrix`)
            }
            const sequencer = invokeMatrix(master, matrixes)
            audioProcess = sequencerToAudioProcess(sequencer, event => {
                const { channel } = event
                if (!channelInstrumentMap[channel]) {
                    addInstrument(channel)
                }
                console.assert(channelInstrumentMap && channelInstrumentMap[channel], 'channelInstrumentMap && channelInstrumentMap[channel]')
                return mix(..._.map(channelInstrumentMap[channel], instrument => instrument(event)))
            })
        } else if (inputFileName && inputFileName.endsWith('.js')) {
            invokeUserScript(fs.readFileSync(inputFileName, { encoding: 'utf-8' }))
            audioProcess = AudioProcess.lastAudioProcessInstance
            if (!audioProcess) {
                throw new Error('script has no AudioProcess')
            }
        } else if (audioProcessLiteral) {
            invokeUserScript(audioProcessLiteral)
            audioProcess = AudioProcess.lastAudioProcessInstance
            if (!audioProcess) {
                throw new Error('AudioProcess literal has no AudioProcess')
            }
        } else {
            args.showHelp()
            process.exit(1)
        }
        console.assert(audioProcess instanceof AudioProcess, 'audioProcess instanceof AudioProcess')
        if (outputFileName.endsWith('.wav')) {
            await audioProcess.writeWaveFile(outputFileName)
        } else if (outputFileName.endsWith('.mp3')) {
            await audioProcess.writeMp3File(outputFileName)
        } else {
            throw new Error(`unsupported output file name extension`)
        }
        if (!quiet) {
            printStats()
        }
        process.exit(0)
    } catch (e) {
        console.error('exception', e)
        process.exit(1)
    }
})()
