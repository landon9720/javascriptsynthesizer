beat = Math.round(.1 * samplesPerSecond)
notes = []
for (x = 0; x < 144; ++x) {
    notes.push(sin(note((x*7)%(12*4)-(12*2))).adsr(beat).delay(x * beat))
}
sum(...notes)
