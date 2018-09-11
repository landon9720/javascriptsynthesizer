const applyScaleToSequence = (sequence, scale) => {
    return sequence.map(e => {
        let rank = e.value
        let octave = e.octave
        while (rank < 0) {
            rank += scale.length
            octave -= 1
        }
        while (rank >= scale.length) {
            rank -= scale.length
            octave += 1
        }
        const value = scale[rank]
        return Object.assign({}, e, { value, octave })
    })
}

const sequenceToScale = (sequence, channel) => {
    console.assert(sequence && sequence.processSequence, 'sequenceToScale sequence must be sequence')
    console.assert(channel && _.isString(channel), 'sequenceToScale channel must be string')
    const sequencerEvents = sequence.processSequence()
    const indexedEvents = _.groupBy(sequencerEvents, 'time')
    let maskLength = 0
    while (_.some(indexedEvents[maskLength++], e => e.channel === channel && (e.value === 0 || e.value === 1))) {}
    console.assert(maskLength-- > 0, 'maskLength must be > 0')
    const mask = _.range(0, maskLength).map(t => [
        t,
        _.some(indexedEvents[t], e => e.channel === channel && e.value === 1),
    ])
    const scale = _(mask)
        .filter(([t, v]) => v)
        .map(([t, v]) => t)
        .value()
    console.assert(!_.isEmpty(scale), 'sequenceToScale scale is empty')
    return scale
}

let { A: aPart, B: bPart, C: cPart, meta } = matrix('matrix1.txt')

cPart = cPart.scale(1/4)

const scale = sequenceToScale(meta, 'major')
let sequence = bPart.flatMap2(({ value, octave, invert }) =>
    aPart.mapValue(([v, o, i]) => [value + v, octave + o, invert])
)
sequence = sequence.flatMap2(({ value, octave, invert, channel }) =>
    cPart.mapValue(([v, o, i]) => [value + v, octave + o, invert]).map(e => _.extend({}, e, { channel }))
)
sequence = applyScaleToSequence(sequence, scale)
sequence = sequence.mapValue(([v, o, i]) => [v, o, i])
// sequence = sequence.scale(1 / 2)
// sequence.table()
// sequence = sequence.loop(4)

const userobject = {
    sin({ value, octave, invert, duration: d }) {
        return sin(note({ value, octave, invert }))
            .adsr({ duration: beats(d) })
            .gain(0.8)
    },
    square({ value, octave, invert, duration: d }) {
        return square(note({ value, octave, invert }))
            .adsr({ duration: beats(d) })
            .gain(0.5)
    },
    saw({ value, octave, invert, duration: d }) {
        return saw(note({ value, octave, invert }))
            .adsr({ A: beats(1), R: beats(2), duration: beats(d) })
            .gain(0.5)
    },
    triangle({ value, octave, invert, duration: d }) {
        return triangle(note({ value, octave, invert }))
            .adsr({ A: beats(1), R: beats(2), duration: beats(d) })
            .offset(beats(1 / 8))
            .gain(0.9)
    },
}

const eventToAudioProcess = sequencerEvent => {
    const key = sequencerEvent.channel
    if (_.has(userobject, key)) {
        const audioProcess = userobject[key](sequencerEvent)
        return audioProcess ? audioProcess : nullAudioProcess
    } else {
        return nullAudioProcess
    }
}

let tune = sequencerToAudioProcess(sequence, eventToAudioProcess)
tune = tune.gain(0.5)
tune = tune.reverb(0.27)
return tune
