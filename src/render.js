import { superFactory } from './superFactory'
import { instrumentFactoryFactory } from './Instrument'
import Sequencer, { Row, charCodeValueInterpreter, rowsToEvents } from './Sequencer'
import { audioProcessOptionsFactory } from './AudioProcess'

const options = audioProcessOptionsFactory(120)
const { sin, square, sum, mix, value, readFile, beats, note, sequencer } = superFactory(options)
const events = rowsToEvents(
    new Row(' tick', '1 ', charCodeValueInterpreter),
    new Row(' kick', '1 ', charCodeValueInterpreter),
    new Row('  jar', ' 1', charCodeValueInterpreter),
)
const { bell: bellFactory } = instrumentFactoryFactory(options)
const bell = bellFactory()
const instrument = ({ tick, kick, jar }) => {
    const a = []
    if (tick) {
        a.push(bell({ value: 0, duration: 0.1 }))
    }
    if (kick) {
        a.push(readFile('kick.raw').offset(7817))
    }
    if (jar) {
        a.push(readFile('jar.raw').offset(14542))
    }
    if (_.isEmpty(a)) {
        throw new Error('invalid')
    }
    return mix(...a)
}
const s = sequencer(events)
    .loop(32, 2)
    .scale(0.5)

const tuneLengthSeconds = 30
s.toAudioProcess(instrument)
    .gain(0.5)
    .writeFile('tune.raw', tuneLengthSeconds)
