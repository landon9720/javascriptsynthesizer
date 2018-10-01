bpm(125)

let { master, synthpart, backup } = matrix(`

master          |                |
synthpart       |0204246876543210

synthpart       |        |
beep.0.duration |1 2 1
beep.4.duration | 12  1
beep.7.duration |  2   
beep.9.duration |      2
click           |1   1
hit             |  1   1

`)

addInstrument('beep')
addInstrument('click')
addInstrument('hit')
let tune
tune = master.channel('synthpart').flatMap2(e => synthpart.mapValue(([v, o, i]) => [e.value + v, o, i]).scale(1 / 4))
tune = tune.mix(master.channel('kick', 'hit'))
return tune
