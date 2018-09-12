let { A: { sin: aPart }, B: { value: bPart }, C: { value: cPart }, meta: { major: meta } } = matrix(`

A           |       |
sin         |0000000
sin.octave  |0
sin.duration|1

B           |           |
value       |02102432105
octave      |0

C           |        |
value       |024 025
duration    |112 112 

meta        |            |
major       |101011010101

`)

cPart = cPart.scale(1 / 4)

let sequence = bPart.flatMap2(({ value, octave, invert }) =>
    aPart.mapValue(([v, o, i]) => [value + v, octave + o, invert])
)
sequence = sequence.flatMap2(({ value, octave, invert, channel }) =>
    cPart.mapValue(([v, o, i]) => [value + v, octave + o, invert]).map(e => _.extend({}, e, { channel }))
)
sequence = sequence.transpose(meta)

function sinx({ value, octave, invert, duration: d }) {
    return sin(note({ value, octave, invert }))
        .adsr({ duration: beats(d) })
        .gain(0.8)
}

function square({ value, octave, invert, duration: d }) {
    return square(note({ value, octave, invert }))
        .adsr({ duration: beats(d) })
        .gain(0.5)
}

function saw({ value, octave, invert, duration: d }) {
    return saw(note({ value, octave, invert }))
        .adsr({ A: beats(1), R: beats(2), duration: beats(d) })
        .gain(0.5)
}

function triangle({ value, octave, invert, duration: d }) {
    return triangle(note({ value, octave, invert }))
        .adsr({ A: beats(1), R: beats(2), duration: beats(d) })
        .offset(beats(1 / 8))
        .gain(0.9)
}

sequence.table('sequence')
let tune = sequencerToAudioProcess(sequence, sinx)
tune = tune.gain(0.5)
tune = tune.reverb(0.27)
return tune
