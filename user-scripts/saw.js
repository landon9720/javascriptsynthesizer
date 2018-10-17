({ value, duration }) => 
    saw(note(value)).adsr({ duration: beats(duration) })
