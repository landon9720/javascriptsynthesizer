({ value, duration }) =>
    sin(note(value))
        .adsr({ duration })
        .gain(0.1)
        .reverb()
