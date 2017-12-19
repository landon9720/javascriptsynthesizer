const basisFrequency = 440
const beautifulNumber = Math.pow(2, 1 / 12)
export const note = (noteNumber = 0, octave = 0) => basisFrequency * Math.pow(beautifulNumber, octave * 12 + noteNumber)
export const beat = b => b * 40 // frames per beat
const k = 1
const a = 5
const b = -10
export const sigmoid = x => k / (1 + Math.pow(Math.E, a + b * x))
