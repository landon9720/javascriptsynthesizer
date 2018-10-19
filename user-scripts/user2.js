let a = 0
const j = readFile('jar.raw').offset(12000)
const k = readFile('kick.raw').offset(5000)
return sequence(j, k).loop(10)
