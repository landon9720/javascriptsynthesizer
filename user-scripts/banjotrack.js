let { master, backup, clicks } = matrix(`

master        |    |
banjo1        |11 1
banjo2        | 1 1
banjo3        |  11
backup        |1111
clicks        |1111

backup        |                                                                |
banjodstrum   |1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 

clicks        | |
click         |1

`)

master = master.scale(64)
clicks = clicks.loop(64)

addInstrument('click')
addInstrument('banjo1', () => readFile('banjo1.raw').offset(15360))
addInstrument('banjo2', () => readFile('banjo2.raw').offset(26112))
addInstrument('banjo3', () => readFile('banjo3.raw').offset(13824))
addInstrument('banjodstrum', () => readFile('banjo-d-strum.raw').offset(635).gain(0.3))

let tune = master
tune = master.channel('banjo1', 'banjo2', 'banjo3')
tune = tune.mix(master.channel('backup').flatMap(() => backup))
tune = tune.mix(master.channel('clicks').flatMap(() => clicks))
return tune
