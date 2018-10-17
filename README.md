# Getting started

Requirements:

* NodeJS 10.0.0
* Yarn
* Sox
* LAME

```
# install npm dependencies
yarn

# build content of ./src to ./dist
yarn build
```

# Demo

## Sin
This is the simplest useful script.

```
sin(440).duration(samplesPerSecond)
```
[1.wav](https://raw.githubusercontent.com/landon9720/zigzag/master/demo/1.wav)

This is a sin wave at 440 hertz, which is the pitch of a violin 'A' string.
`duration` is required. Otherwise, the audio would go on forever...
Using `samplesPerSecond` gives us 1 second of audio.

## Note
`note` provides a frequency (in hertz) from a value.
`seconds` calculates the sample count from seconds.

```
sin(note(0)).duration(seconds(1))
```
[2.wav](https://raw.githubusercontent.com/landon9720/zigzag/master/demo/2.wav)

Value 0 is 'Middle C'.

# References

* [Monads in functional programming](https://en.wikipedia.org/wiki/Monad_(functional_programming))
* [Fundamentals of Acoustics](https://www.amazon.com/Fundamentals-Acoustics-Lawrence-Kinsler/dp/0471847895)
