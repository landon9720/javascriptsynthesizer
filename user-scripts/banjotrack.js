let { master, backup, clicks, synthpart } = matrix(`

master          |     |
banjo1          |11  1
banjo2          | 1 11
banjo3          |  1 1
fiddle1         |11111
backup          |111 1
clicks          |11111
synthpart       |11111

backup          |                                                                |
banjodstrum     |1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 
+duration       |1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 
hit             | 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 

clicks          | |
click           |1

synthpart       |                                                                |
beep.0.duration |1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2 1 2 
beep.4.duration | 12  12  12  12  12  12  12  12  12  12  12  12  12  12  12  12 
beep.7.duration |  2   2   2   2   2   2   2   2   2   2   2   2   2   2   2   2 

`)

master = master.scale(64)
clicks = clicks.loop(64)

addInstrument('click')
addInstrument('banjo1', () =>
    readFile('banjo1.raw')
        .offset(15360)
        .gain(0.5)
)
addInstrument('banjo2', () =>
    readFile('banjo2.raw')
        .offset(26112)
        .gain(0.5)
)
addInstrument('banjo3', () =>
    readFile('banjo3.raw')
        .offset(13824)
        .gain(0.5)
)
addInstrument('fiddle1', () =>
    readFile('fiddle1.raw')
        .offset(29000)
        .gain(0.2)
        .reverb(0.4)
)
addInstrument('banjodstrum', ({ duration }) =>
    readFile('banjo-d-strum.raw')
        .offset(635)
        .gain(0.2)
        .adsr({ duration: beats(duration) })
)
addInstrument('hit')
addInstrument('beep')

let tune = master
tune = master.channel('banjo1', 'banjo2', 'banjo3', 'fiddle1')
tune = tune.mix(master.channel('backup').flatMap(() => backup))
tune = tune.mix(master.channel('clicks').flatMap(() => clicks))
tune = tune.mix(master.channel('synthpart').flatMap(() => synthpart)).mapValue(([v, o, i]) => [v + 2, o, i])
return tune
