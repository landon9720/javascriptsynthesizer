let { tune } = matrix(`
tune        |    |
click       |1111
`)

tune = tune.loop(17)

addInstrument('click')
return tune
