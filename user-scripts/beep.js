({ value, octave, invert, duration }) =>
    sin(note({ value, octave, invert }))
        .adsr({ duration: beats(duration) })
        .gain(0.05)
