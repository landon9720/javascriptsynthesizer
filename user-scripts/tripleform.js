let { master  } = matrix(`

master         |         |
beep.0.duration|1       2
beep.4.duration| 1     1
beep.7.duration|  1   1
beep.c.duration|   2 1
`)

addInstrument('beep')
return master
