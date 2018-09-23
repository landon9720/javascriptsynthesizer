({ value, octave, invert, duration }) => 
    saw(note({ value, octave, invert })).adsr({ duration: beats(duration) })
