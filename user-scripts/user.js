let {
    melody: { m },
    triad: { n },
    percussion: { kick, hit, jar },
    meta: { major: meta },
} = matrix(`

melody      |        |
m           |00110203
m.duration  |1

triad |                |
n     |0247024887654321

percussion  |        |
kick        |0 0 0 0 
hit         | 0 0 0 0
jar         |00000000

meta        |            |
major       |101011010101

`)

m = m
    .transpose(meta)
    .flatMap2(e => n.mapValue(([v, o, i]) => [e.value + v, o, i]))

const f = 16

kick = kick.loop(f)
hit = hit.loop(f)
jar = jar.loop(f)

const melody = sequencerToAudioProcess(m, ({ value, duration: d }) =>
    sin(note(value))
        .adsr({ duration: beats(d) })
        .gain(0.4)
)

const hits = sequencerToAudioProcess(hit, () =>
    whitenoise()
        .adsr({ duration: beats(1 / 20), sustainLevel: 0.3 })
        .gain(0.4)
        .offset(samplesPerSecond / 50)
)
    .highpass(Math.pow(2, 10))
    .lowpass(Math.pow(2, 13))

const kicks = sequencerToAudioProcess(kick, () =>
    saw(value(Math.pow(2, 7)))
        .adsr({ A: beats(1 / 10), D: beats(1 / 10), S: beats(1 / 10), R: beats(1 / 10) })
        .gain(0.4)
        .offset(samplesPerSecond / 50)
).lowpass(Math.pow(2, 9))

const jars = sequencerToAudioProcess(jar, () =>
    readFile('jar.raw')
        .offset(14000)
        .highpass(Math.pow(2, 7))
        .gain(0.4)
)

let tune = mix(melody, hits, kicks, jars)
tune = tune.gain(0.5)
tune = tune.reverb(0.27)
return tune
