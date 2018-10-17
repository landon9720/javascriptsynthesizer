({ value, duration }) => 
    sin(note(value)).adsr({ duration: beats(duration) })
