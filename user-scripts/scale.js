let { tune, triad, meta } = matrix(`

tune        |                                |
beep        |0123456789abcdedcba9876543210000

meta        |            |
major       |101011010101
`)

tune = tune.transpose(meta, 'major')

addInstrument('beep')
return tune
