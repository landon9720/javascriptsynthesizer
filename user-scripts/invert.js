let { tune } = matrix(`
tune        |                |
beep        |01230123
saw         |        01230123
invert      |0   1   0   1   
`)
addInstrument('beep')
addInstrument('saw')
return tune
