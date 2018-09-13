let {
    A: { sin: aPart, hit: hitPart, kick: kickPart },
    B: { value: bPart },
    C: { value: cPart },
    meta: { major: meta },
} = matrix(`

A           |        |
sin         |00000000|
sin.octave  |0       |
sin.duration|1       |
kick        |0 0 0 0 |
hit         | 0 0 0 0|

B           |       |
value       |0123450|
octave      |0      |

C           |        |
value       |024 025 |
duration    |112 112 |

meta        |            |
major       |101011010101|

`)

cPart = cPart.scale(1 / 4)

let sequence = bPart.flatMap2(({ value, octave, invert }) =>
    aPart.mapValue(([v, o, i]) => [value + v, octave + o, invert])
)
sequence = sequence.flatMap2(({ value, octave, invert, channel }) =>
    cPart.mapValue(([v, o, i]) => [value + v, octave + o, invert]).map(e => _.extend({}, e, { channel }))
)
sequence = sequence.transpose(meta)

const melody = sequencerToAudioProcess(sequence, ({ value, octave, invert, duration: d }) =>
    sin(note({ value, octave, invert }))
        .adsr({ duration: beats(d) })
        .gain(0.8)
)

const hits = sequencerToAudioProcess(hitPart.loop(13), () =>
    whitenoise()
        .adsr({ duration: beats(1 / 20), sustainLevel: 0.3 })
        .gain(0.5)
        .offset(samplesPerSecond / 50)
)
    .highpass(Math.pow(2, 10))
    .lowpass(Math.pow(2, 13))

const kicks = sequencerToAudioProcess(kickPart.loop(13), () =>
    square(value(Math.pow(2, 7)).add(sin(2).gain(8)))
        .adsr({ duration: beats(1 / 2), sustainLevel: 0.9 })
        .gain(0.5)
        .offset(samplesPerSecond / 50)
)
    .lowpass(Math.pow(2, 9))

let tune = mix(melody, hits, kicks)
tune = tune.gain(0.5)
tune = tune.reverb(0.27)
return tune
