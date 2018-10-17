# zigzag demonstration

#### Sin
This is the simplest useful script.
```
sin(440).duration(samplesPerSecond)
```
[1.wav](/1.wav)

This is a sin wave at 440 hertz, which is the pitch of a violin 'A' string.
`duration` is required. Otherwise, the audio would go on forever...
Using `samplesPerSecond` gives us 1 second of audio.

#### Note
`note` provides a frequency (in hertz) from a value.
`seconds` calculates the sample count from seconds.
```
sin(note(0)).duration(seconds(1))
```
[2.wav](/2.wav)

Value 0 is 'Middle C'.

