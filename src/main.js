import fs from 'fs'
import { superFactory } from './superFactory'
import { instrumentFactoryFactory } from './Instrument'
import AudioProcessReadable from './AudioProcessReadable'
import { rowsToEvents, row } from './Sequencer'

const bpm = 125
const samplesPerFrame = Math.pow(2, 14)
const samplesPerSecond = 44100
const samplesPerBeat = (samplesPerSecond * 60) / bpm
const options = {
    samplesPerFrame,
    samplesPerSecond,
    samplesPerBeat,
}
const { sin, square, sum, value, readFile, beats, note, sequencer } = superFactory(options)
const { bell } = instrumentFactoryFactory(options)
const events = rowsToEvents(row('one', '0000'))
const s = sequencer(events).repeat(4, 4)
const tune = s.toAudioProcess(readFile('one.raw')).gain(0.5)
const tuneLengthSeconds = 60
const tuneFrameCount = Math.ceil((tuneLengthSeconds * samplesPerSecond) / samplesPerFrame)
const reader = new AudioProcessReadable(tune, tuneFrameCount)
const writer = fs.createWriteStream('tune.raw')
writer.on('error', e => {
    console.error('writer error', e)
})
reader.pipe(writer)
