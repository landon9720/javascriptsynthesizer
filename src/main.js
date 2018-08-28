import fs from 'fs'
import { audioProcessFactoryFactory } from './factories'
import { note } from './fundamentals'
// import Instrument, { bell } from './Instrument'
import AudioProcessReader from './AudioProcessReader'
import { rowsToEvents, row, sequence } from './Sequencer'
import {  } from './factories'
import defer from './defer'

const options = { 
    samplesPerFrame: 1024, 
    samplesPerSecond: 8000, 
    samplesPerBeat: 1024,
}

const { sin, sum } = audioProcessFactoryFactory(options)

// const events = rowsToEvents(
//     row('value', '0123456'),
//     // row('   value', '000000002  2  0  '),
//     // row('duration', '1       4        '),
//     // row('   value', '11110 0 '),
//     // row('duration', '11112   '),
//     // row('   value', '333 333 33123 4444433355421'),
//     // row('duration', '1 2 1   1   2 1           2')
// )

// let s = sequence(events) //.repeat(4, 8)
// // s = s.mix(s.delay(4))

// s.table()

// let tune = read('in.raw').delay(beats(1))
// tune = sum(tune, tune.delay(10))
// const tune = s.toAudioProcess(bell)

const tune = 
    sum(
        ..._.range(0, 4).map(i => sin(110 * i).multiply(.2))
    )

    // const tune = sin(440).adsr().delaySamples(Math.pow(2, 9))
// const tune = sum(
//     ..._.range(0, 2).map(b => sin(note(b)).adsr().delay(beats(b) / 2))
// ).multiply(0.2)

const reader = new AudioProcessReader(tune, 1)
const writer = fs.createWriteStream('tune.raw')
writer.on('error', e => {
    console.error('writer error', e)
})
writer.on('close', () => {
    console.log('writer close')
})
reader.pipe(writer)
