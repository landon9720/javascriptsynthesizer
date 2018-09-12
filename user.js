let { A: aPart, B: bPart, C: cPart, meta } = matrix(`

A           |       |
sin         |0000000
sin.octave  |0
sin.duration|1

B     |           |
value |02102432105
octave|0

C       |        |
value   |024 025
duration|112 112 

meta |            |
major|101011010101

`)

cPart = cPart.scale(1 / 4)

let sequence = bPart.flatMap2(({ value, octave, invert }) =>
    aPart.mapValue(([v, o, i]) => [value + v, octave + o, invert])
)
sequence = sequence.flatMap2(({ value, octave, invert, channel }) =>
    cPart.mapValue(([v, o, i]) => [value + v, octave + o, invert]).map(e => _.extend({}, e, { channel }))
)
sequence = sequence.transpose(meta.major)
sequence.table()

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
