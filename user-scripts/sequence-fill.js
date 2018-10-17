let { tune, triad, percussion, meta } = matrix(`

tune        |        |
m           |00110203

triad       |                |
n           |0247024887654321

meta        |            |
major       |101011010101

percussion  |        |
kick        |0 0 0 0 
hit         | 0 0 0 0
jar         |00000000

`)

tune = tune.flatMap2(e => triad.mapValue(([v, o, i]) => [e.value + v, o, i])).transpose(meta, 'major')

percussion = percussion.loop(Math.ceil(tune.duration / percussion.duration))

tune = tune.mix(percussion)

tune = sequencerToAudioProcess(tune, ({ channel, value: v, duration: d }) => {
    switch (channel) {
        case 'n':
            return sin(note(v))
                .adsr({ duration: beats(d) })
                .gain(0.4)
        case 'hit':
            return whitenoise()
                .adsr({ duration: beats(1 / 20), sustainLevel: 0.3 })
                .gain(0.4)
                .offset(samplesPerSecond / 50)
                .highpass(Math.pow(2, 10))
                .lowpass(Math.pow(2, 13))
        case 'kick':
            return saw(value(Math.pow(2, 7)))
                .adsr({ A: beats(1 / 10), D: beats(1 / 10), S: beats(1 / 10), R: beats(1 / 10) })
                .gain(0.4)
                .offset(samplesPerSecond / 50)
                .lowpass(Math.pow(2, 9))
        case 'jar':
            return readFile('jar.raw')
                .offset(14000)
                .highpass(Math.pow(2, 7))
                .gain(0.4)
        default:
            console.warn(`channel ${channel} did not match`)
    }
})

tune = tune.gain(0.5)
tune = tune.reverb(0.27)
return tune
